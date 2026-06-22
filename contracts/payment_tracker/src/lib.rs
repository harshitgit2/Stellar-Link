#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, String, Symbol, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PaymentRecord {
    pub sender: Address,
    pub recipient: Address,
    pub amount: i128,
    pub memo: String,
    pub timestamp: u64,
}

#[contract]
pub struct PaymentTrackerContract;

#[contractimpl]
impl PaymentTrackerContract {
    /// Records a new payment transaction event in contract history.
    /// This requires the sender's signature/authorization.
    pub fn record_payment(
        env: Env,
        sender: Address,
        recipient: Address,
        amount: i128,
        memo: String,
    ) {
        // Authenticate the sender
        sender.require_auth();
        
        let timestamp = env.ledger().timestamp();
        let record = PaymentRecord {
            sender: sender.clone(),
            recipient,
            amount,
            memo,
            timestamp,
        };
        
        // Retrieve existing history list or initialize a new one
        let key = symbol_short!("history");
        let mut history: Vec<PaymentRecord> = env.storage().persistent().get(&key).unwrap_or(Vec::new(&env));
        
        // Push record and prune to retain only the last 20 payments (conserves ledger storage)
        history.push_back(record);
        if history.len() > 20 {
            history.remove(0);
        }
        
        // Store updated list
        env.storage().persistent().set(&key, &history);
        
        // Publish contract event for off-chain monitoring/indexing
        env.events().publish(
            (symbol_short!("payment"), sender),
            amount,
        );
    }
    
    /// Returns the vector of stored payment records.
    pub fn get_payments(env: Env) -> Vec<PaymentRecord> {
        let key = symbol_short!("history");
        env.storage().persistent().get(&key).unwrap_or(Vec::new(&env))
    }
}

mod test;
