const fs = require('fs');
const BN = require('bn.js');
const nearAPI = require('near-api-js');
const testUtils = require('./test-utils');
const getConfig = require('../src/config');

const {
	Contract, KeyPair, Account,
	utils: { format: { parseNearAmount } },
	transactions: { deployContract, functionCall },
} = nearAPI;
const {
	connection, initContract, getAccount, getAccountBalance,
	contract, contractAccount, contractName, contractMethods, createAccessKeyAccount,
	createOrInitAccount,
	getContract,
} = testUtils;
const {
	networkId, GAS, GUESTS_ACCOUNT_SECRET
} = getConfig();

jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;

const DELIMETER = '.';

const now = Date.now();
const tokenIds = [
	`token:${now}`,
	`token:${now}`,
	`token:${now}`,
];
const contract_royalty = 500;

const metadata = {
	media: 'https://media.giphy.com/media/h2ZVjT3kt193cxnwm1/giphy.gif',
	issued_at: now.toString()
};
const metadata2 = {
	media: 'https://media.giphy.com/media/laUY2MuoktHPy/giphy.gif',
	issued_at: now.toString()
};

/// contractAccount.accountId is the NFT contract and contractAccount is the owner
/// see initContract in ./test-utils.js for details
const contractId = contractAccount.accountId;
console.log('\n\n contractId:', contractId, '\n\n');
/// the market contract
const marketId = 'market.' + contractId;

describe('deploy contract ' + contractName, () => {

	let alice, aliceId, bob, bobId,
		marketAccount,
		storageMinimum, storageMarket;

	/// most of the following code in beforeAll can be used for deploying and initializing contracts
	/// skip tests if you want to deploy to production or testnet without any NFTs
	beforeAll(async () => {
		await initContract();

		/// some users
		aliceId = 'alice-' + now + '.' + contractId;
		alice = await getAccount(aliceId);
		console.log('\n\n Alice accountId:', aliceId, '\n\n');

		bobId = 'bob-' + now + '.' + contractId;
		bob = await getAccount(bobId);
		console.log('\n\n Bob accountId:', bobId, '\n\n');

		// set contract royalty to 5%
		await contractAccount.functionCall({
			contractId: contractName,
			methodName: 'set_contract_royalty',
			args: { contract_royalty },
			gas: GAS
		});

		/** 
		 * Deploy the Market Contract and connect it to the NFT contract (contractId)
		 * and the FT contract (fungibleAccount.[contractId])
		 */


		/// create or get market account and deploy market.wasm (if not already deployed)
		marketAccount = await createOrInitAccount(marketId, GUESTS_ACCOUNT_SECRET);
		const marketAccountState = await marketAccount.state();
		console.log('\n\nstate:', marketAccountState, '\n\n');
		if (marketAccountState.code_hash === '11111111111111111111111111111111') {

			const marketContractBytes = fs.readFileSync('./out/market.wasm');
			console.log('\n\n deploying marketAccount contractBytes:', marketContractBytes.length, '\n\n');
			const newMarketArgs = {
				owner_id: contractId,
			};
			const actions = [
				deployContract(marketContractBytes),
				functionCall('new', newMarketArgs, GAS)
			];
			await marketAccount.signAndSendTransaction({ receiverId: marketId, actions });
		}

		/// find out how much needed for market storage
		storageMarket = await contractAccount.viewFunction(marketId, 'storage_minimum_balance');
		console.log('\n\n storageMarket:', storageMarket, '\n\n');
	});

	test('NFT enumerable tests (no tokens)', async () => {
		const nft_supply_for_owner = await bob.viewFunction(contractName, 'nft_supply_for_owner', { account_id: bobId });
		console.log('\n\n nft_supply_for_owner', nft_supply_for_owner, '\n\n');
		expect(nft_supply_for_owner).toEqual('0');
		// messing around with index and limit
		const bobTokens = await bob.viewFunction(contractName, 'nft_tokens_for_owner', {
			account_id: bobId, from_index: '1001', limit: 100
		});
		console.log('\n\n bobTokens', bobTokens, '\n\n');
		expect(bobTokens.length).toEqual(0);
	});

	test('alice mints nft and approves a sale for a fixed amount of NEAR', async () => {
		const token_id = tokenIds[0];
		await alice.functionCall({
			contractId: marketId,
			methodName: 'storage_deposit',
			args: {},
			gas: GAS,
			attachedDeposit: storageMarket
		});
		await alice.functionCall({
			contractId: contractId,
			methodName: 'nft_mint',
			args: {
				token_id,
				metadata,
				perpetual_royalties: {
					'a1.testnet': 500,
					'a2.testnet': 250,
					'a3.testnet': 250,
					'a4.testnet': 250,
					'a5.testnet': 250,
					// 'a6.testnet': 250,
					// 'a7.testnet': 250,
				},
			},
			gas: GAS,
			attachedDeposit: parseNearAmount('1')
		});

		const price = parseNearAmount('1');
		let sale_conditions = price;

		await alice.functionCall({
			contractId: contractId,
			methodName: 'nft_approve',
			args: {
				token_id,
				account_id: marketId,
				msg: JSON.stringify({ sale_conditions })
			},
			gas: GAS,
			attachedDeposit: parseNearAmount('0.01')
		});

		const sale = await alice.viewFunction(marketId, 'get_sale', {
			nft_contract_token: contractId + DELIMETER + token_id
		});
		console.log('\n\n get_sale result for nft', sale, '\n\n');
		expect(sale.sale_conditions).toEqual(price);
	});

	test('get sales supply', async () => {
		const supply = await contractAccount.viewFunction(marketId, 'get_supply_sales', {});
		console.log('\n\n', supply, '\n\n');
		expect(parseInt(supply, 10) > 0).toEqual(true);
	});

	test('get sales & supply by owner id', async () => {
		const sales_by_owner_id = await contractAccount.viewFunction(marketId, 'get_sales_by_owner_id', {
			account_id: aliceId,
			from_index: '0',
			limit: 50
		});
		console.log('\n\n sales_by_owner_id', sales_by_owner_id, '\n\n');
		expect(sales_by_owner_id.length).toEqual(1);

		const supply = await contractAccount.viewFunction(marketId, 'get_supply_by_owner_id', {
			account_id: aliceId,
		});
		console.log('\n\n get_supply_by_owner_id', supply, '\n\n');
		expect(parseInt(supply, 10) > 0).toEqual(true);
	});

	test('get sales & supply by nft contract id', async () => {
		const sales_by_nft_contract_id = await contractAccount.viewFunction(marketId, 'get_sales_by_nft_contract_id', {
			nft_contract_id: contractId,
			from_index: '0',
			limit: 50
		});
		console.log('\n\n sales_by_nft_contract_id', sales_by_nft_contract_id, '\n\n');
		expect(sales_by_nft_contract_id.length > 0).toEqual(true);

		const supply = await contractAccount.viewFunction(marketId, 'get_supply_by_nft_contract_id', {
			nft_contract_id: contractId,
		});
		console.log('\n\n get_supply_by_nft_contract_id', supply, '\n\n');
		expect(parseInt(supply, 10) > 0).toEqual(true);
	});

	test('bob purchase nft with NEAR', async () => {
		const token_id = tokenIds[0];
		const aliceBalanceBefore = await getAccountBalance(aliceId);
		/// purchase = near deposit = sale.price -> nft_transfer -> royalties transfer near
		await bob.functionCall({
			contractId: marketId,
			methodName: 'offer',
			args: {
				nft_contract_id: contractId,
				token_id,
			},
			gas: GAS,
			attachedDeposit: parseNearAmount('1')
		});
		/// check owner
		const token = await contract.nft_token({ token_id });
		expect(token.owner_id).toEqual(bobId);
		// check alice balance went up by over 80% of 1 N
		const aliceBalanceAfter = await getAccountBalance(aliceId);
		expect(new BN(aliceBalanceAfter.total).sub(new BN(aliceBalanceBefore.total)).gt(new BN(parseNearAmount('0.79')))).toEqual(true);
	});

	test('contract account registers bob with market contract', async () => {
		await contractAccount.functionCall({
			contractId: marketId,
			methodName: 'storage_deposit',
			args: { account_id: bobId },
			gas: GAS,
			attachedDeposit: storageMarket
		});
		const result = await contractAccount.viewFunction(marketId, 'storage_balance_of', { account_id: bobId });
		expect(result).toEqual(parseNearAmount('0.01'));
	});

	test('bob withdraws storage', async () => {
		await bob.functionCall({
			contractId: marketId,
			methodName: 'storage_withdraw',
			args: {},
			gas: GAS,
			attachedDeposit: 1
		});
		const result = await contractAccount.viewFunction(marketId, 'storage_balance_of', { account_id: bobId });
		expect(result).toEqual('0');
	});

	test('bob approves sale with  NEAR (fixed prices)', async () => {
		const token_id = tokenIds[0];
		await bob.functionCall({
			contractId: marketId,
			methodName: 'storage_deposit',
			args: {},
			gas: GAS,
			attachedDeposit: storageMarket
		});

		const token = await contract.nft_token({ token_id });

		/// deprecated

		// let sale_conditions = [
		// 	{
		// 		ft_token_id: fungibleId,
		// 		price: parseNearAmount('25'),
		// 	},
		// 	{
		// 		ft_token_id: 'near',
		// 		price: parseNearAmount('1'),
		// 	}
		// ];

		/// these will be reserve prices because is_auction on the msg field of nft_approve will be true

		let sale_conditions = parseNearAmount('1');

		console.log('\n\n sale_conditions', sale_conditions, '\n\n');
		console.log('\n\n token.royalty', token.royalty, '\n\n');

		if (token.royalty.length > 8) {
			throw new Error("Cannot have more than 8 royalties + sale collateral at the same time");
		}

		await bob.functionCall({
			contractId,
			methodName: 'nft_approve',
			args: {
				token_id,
				account_id: marketId,
				msg: JSON.stringify({ sale_conditions })
			},
			gas: GAS,
			attachedDeposit: storageMarket
		});
		const sale = await bob.viewFunction(marketId, 'get_sale', { nft_contract_token: contractId + DELIMETER + token_id });
		console.log('\n\n get_sale', sale, '\n\n');
		expect(sale.sale_conditions).toEqual(parseNearAmount('1'));
	});

	test('enumerable tests', async () => {
		const total_supply = await bob.viewFunction(contractName, 'nft_total_supply', {});
		console.log('\n\n total_supply', total_supply, '\n\n');
		// could be several tests in, with many tokens minted
		const nft_supply_for_owner = await bob.viewFunction(contractName, 'nft_supply_for_owner', { account_id: bobId });
		console.log('\n\n nft_supply_for_owner', nft_supply_for_owner, '\n\n');
		expect(nft_supply_for_owner).toEqual('1');
		const tokens = await bob.viewFunction(contractName, 'nft_tokens', { from_index: '0', limit: 100 });
		console.log('\n\n nft_tokens', tokens, '\n\n');
		// proxy for total supply with low limits, could be several tests in, with many tokens minted
		expect(tokens.length > 0).toEqual(true);
		const bobTokens = await bob.viewFunction(contractName, 'nft_tokens_for_owner', { account_id: bobId, from_index: '0', limit: 100 });
		console.log('\n\n nft_tokens_for_owner (bob)', bobTokens, '\n\n');
		expect(bobTokens.length).toEqual(1);
	});

	test('bob changes reserve price in NFT to 10 N', async () => {
		const token_id = tokenIds[0];
		await bob.functionCall({
			contractId: marketId,
			methodName: 'update_price',
			args: {
				nft_contract_id: contractId,
				token_id,
				price: parseNearAmount('10')
			},
			gas: GAS,
			attachedDeposit: 1
		});
		const sale = await bob.viewFunction(marketId, 'get_sale', { nft_contract_token: contractId + DELIMETER + token_id });
		console.log('\n\n get_sale (updated price to 10 N)', sale, '\n\n');
		expect(sale.sale_conditions).toEqual(parseNearAmount('10'));
	});
});