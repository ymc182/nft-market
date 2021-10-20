use crate::*;
use near_sdk::promise_result_as_success;

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct Sale {
    pub owner_id: AccountId,
    pub approval_id: u64,
    pub nft_contract_id: String,
    pub token_id: String,
    pub sale_conditions: SalePriceInNear,
    pub created_at: U64,
}

#[derive(Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct PurchaseArgs {
    pub nft_contract_id: ValidAccountId,
    pub token_id: TokenId,
}

#[near_bindgen]
impl Contract {
    /// for add sale see: nft_callbacks.rs

    /// TODO remove without redirect to wallet? panic reverts
    #[payable]
    pub fn remove_sale(&mut self, nft_contract_id: ValidAccountId, token_id: String) {
        assert_one_yocto();
        let sale = self.internal_remove_sale(nft_contract_id.into(), token_id);
        let owner_id = env::predecessor_account_id();
        assert_eq!(owner_id, sale.owner_id, "Must be sale owner");
    }

    #[payable]
    pub fn update_price(
        &mut self,
        nft_contract_id: ValidAccountId,
        token_id: String,
        price: U128,
    ) {
        assert_one_yocto();
        let contract_id: AccountId = nft_contract_id.into();
        let contract_and_token_id = format!("{}{}{}", contract_id, DELIMETER, token_id);
        let mut sale = self.sales.get(&contract_and_token_id).expect("No sale");

        assert_eq!(
            env::predecessor_account_id(),
            sale.owner_id,
            "Must be sale owner"
        );
        
        sale.sale_conditions = price;
        self.sales.insert(&contract_and_token_id, &sale);
    }

    #[payable]
    pub fn offer(&mut self, nft_contract_id: ValidAccountId, token_id: String) {
        let deposit = env::attached_deposit();
        assert!(deposit > 0, "Attached deposit must be greater than 0");

        let contract_id: AccountId = nft_contract_id.into();
        let contract_and_token_id = format!("{}{}{}", contract_id, DELIMETER, token_id);
        let sale = self.sales.get(&contract_and_token_id).expect("No sale");
        let buyer_id = env::predecessor_account_id();
        assert_ne!(sale.owner_id, buyer_id, "Cannot bid on your own sale.");
        let price = sale.sale_conditions.0;

        assert!(deposit >= price, "Attached deposit must be greater than or equal to the current price: {:?}", price);

        self.process_purchase(
            contract_id,
            token_id,
            U128(deposit),
            buyer_id,
        );
    }

    #[private]
    pub fn process_purchase(
        &mut self,
        nft_contract_id: AccountId,
        token_id: String,
        price: U128,
        buyer_id: AccountId,
    ) -> Promise {
        let sale = self.internal_remove_sale(nft_contract_id.clone(), token_id.clone());

        ext_contract::nft_transfer_payout(
            buyer_id.clone(),
            token_id,
            sale.approval_id,
            "payout from market".to_string(),
            price,
			10,
            &nft_contract_id,
            1,
            GAS_FOR_NFT_TRANSFER,
        )
        .then(ext_self::resolve_purchase(
            buyer_id,
            price,
            &env::current_account_id(),
            NO_DEPOSIT,
            GAS_FOR_ROYALTIES,
        ))
    }

    /// self callback

    #[private]
    pub fn resolve_purchase(
        &mut self,
        buyer_id: AccountId,
        price: U128,
    ) -> U128 {

        // checking for payout information
        let payout_option = promise_result_as_success().and_then(|value| {
            // None means a bad payout from bad NFT contract
            near_sdk::serde_json::from_slice::<Payout>(&value)
                .ok()
                .and_then(|payout| {
                    // gas to do 10 FT transfers (and definitely 10 NEAR transfers)
                    if payout.len() > 10 || payout.is_empty() {
                        env::log(format!("Cannot have more than 10 royalties").as_bytes());
                        None
                    } else {
                        // TODO off by 1 e.g. payouts are fractions of 3333 + 3333 + 3333
                        let mut remainder = price.0;
                        for &value in payout.values() {
                            remainder = remainder.checked_sub(value.0)?;
                        }
                        //Checking to see if we are paying out royalties that sum to more than the price.
                        if remainder == 0 || remainder == 1 {
                            Some(payout)
                        } else {
                            None
                        }
                    }
                })
        });
        // is payout option valid?
        let payout = if let Some(payout_option) = payout_option {
            payout_option
        } else {
            Promise::new(buyer_id).transfer(u128::from(price));
            // leave function and return all FTs in ft_resolve_transfer
            return price;
        };

        // NEAR payouts
        for (receiver_id, amount) in payout {
            Promise::new(receiver_id).transfer(amount.0);
        }

        price
    }
}

/// self call

#[ext_contract(ext_self)]
trait ExtSelf {
    fn resolve_purchase(
        &mut self,
        buyer_id: AccountId,
        price: U128,
    ) -> Promise;
}
