import path from 'path';
import { Runner, ReturnedAccounts } from 'near-runner-ava';
import { parseNearAmount } from 'near-api-js/lib/utils/format';

export interface Token {
  token_id: string;
  owner_id: string;
  metadata?: TokenMetadata,
  approved_account_ids?: Record<string, number>;
}

export interface TokenMetadata {
  title?: string;
  description?: string;
  media?: string;
  media_hash?: string;
  copies?: number;
  issued_at?: string;
  expires_at?: string;
  starts_at?: string;
  updated_at?: string;
  extra?: string;
  reference?: string;
  reference_hash?: string;
}

export const TOKEN_ID = '0';

const NFT_METADATA = {
    spec: 'nft-1',
    name: 'Test NFT',
    symbol: 'TNFT',
};

const SUPPLY_CAP_BY_TYPE = {
    test: '1000000',
};

const BID_HISTORY_LENGTH = 3;
const DELIMETER = '||';

export function createRunner(more: ((accounts: ReturnedAccounts) => Promise<ReturnedAccounts | void>) = async () => ({})) {
  return Runner.create(async ({ root }) => {
    const alice = await root.createAccount('alice');
    const nft = await root.createAndDeploy(
        'nft',
        path.join(__dirname, '..', 'out', 'main.wasm'),
        {
          method: 'new',
          args: { owner_id: root, metadata: NFT_METADATA, supply_cap_by_type: SUPPLY_CAP_BY_TYPE }
        }
    );

    const newFungibleArgs = {
        /// will have totalSupply minted to them
        owner_id: root,
        total_supply: parseNearAmount('1000000'),
        name: 'Test Fungible T',
        symbol: 'TFT',
        // not set by user request
        version: '1',
        reference: 'https://github.com/near/core-contracts/tree/master/w-near-141',
        reference_hash: '7c879fa7b49901d0ecc6ff5d64d7f673da5e4a5eb52a8d50a214175760d8919a',
        decimals: 24,
    };

    const ft = await root.createAndDeploy(
        'ft',
        path.join(__dirname, '..', 'out', 'ft.wasm'),
        {
          method: 'new',
          args: newFungibleArgs
        }
    );

    const ft_token_ids = [ft];
    const newMarketArgs = {
        owner_id: root,
        ft_token_ids,
        bid_history_length: BID_HISTORY_LENGTH,
    };

    const market = await root.createAndDeploy(
        'market',
        path.join(__dirname, '..', 'out', 'market.wasm'),
        {
          method: 'new',
          args: newMarketArgs
        }
    );

    const additionalAccounts = await more({ alice, root, nft, market });

    return {
      ...(additionalAccounts || {}),
      alice,
      nft
    };
  });
}