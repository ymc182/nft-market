/**
 * This test demonstrates basic behavior of near-runner, making simple
 * function calls and view calls to the contract from
 * https://github.com/near-examples/rust-status-message
 *
 * Note that the same tests will be run on both a local sandbox environment and
 * on testnet by using the `test:sandbox` and `test:testnet` scripts in
 * package.json.
 */
 import { createRunner } from './utils';

 const runner = createRunner(async ({ root }) => ({
  bob: await root.createAccount('bob'),
}));

runner.test('NFT enumerable tests (no tokens)', async (t, {nft, bob}) => {
  const nft_supply_for_owner = await nft.view('nft_supply_for_owner', { account_id: bob });
    t.is(nft_supply_for_owner, '0');
		// messing around with index and limit
		const bobTokens: any = await nft.view('nft_tokens_for_owner', {
			account_id: bob, from_index: '1001', limit: 100
		});
    t.is(bobTokens.length, 0);
});