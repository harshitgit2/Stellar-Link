#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, Env, String};

#[test]
fn test_record_and_fetch_payments() {
    // 1. Setup environment
    let env = Env::default();
    env.mock_all_auths();

    // 2. Register the contract
    let contract_id = env.register_contract(None, PaymentTrackerContract);
    let client = PaymentTrackerContractClient::new(&env, &contract_id);

    // 3. Define test inputs
    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);
    let amount = 25000000_i128; // 2.5 XLM
    let memo = String::from_str(&env, "Coffee Payment");

    // 4. Invoke contract method
    client.record_payment(&sender, &recipient, &amount, &memo);

    // 5. Verify records
    let payments = client.get_payments();
    assert_eq!(payments.len(), 1);

    let first_record = payments.get(0).unwrap();
    assert_eq!(first_record.sender, sender);
    assert_eq!(first_record.recipient, recipient);
    assert_eq!(first_record.amount, amount);
    assert_eq!(first_record.memo, memo);
}
