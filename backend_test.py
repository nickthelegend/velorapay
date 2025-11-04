#!/usr/bin/env python3
"""
VeloraPay Backend API Testing Suite
Tests all backend endpoints comprehensively
"""

import requests
import json
import time
from datetime import datetime
from typing import Dict, Any, Optional

class VeloraPayTester:
    def __init__(self):
        # Get backend URL from frontend .env file
        try:
            with open('/app/frontend/.env', 'r') as f:
                env_content = f.read()
                for line in env_content.split('\n'):
                    if line.startswith('EXPO_PUBLIC_BACKEND_URL='):
                        self.base_url = line.split('=')[1].strip()
                        break
                else:
                    raise ValueError("EXPO_PUBLIC_BACKEND_URL not found in frontend/.env")
        except Exception as e:
            print(f"❌ Error reading backend URL from frontend/.env: {e}")
            self.base_url = "http://localhost:8001"  # fallback
        
        self.api_url = f"{self.base_url}/api"
        print(f"🔗 Testing backend at: {self.api_url}")
        
        # Test data
        self.user1_data = {
            "username": "alice_smith",
            "password": "SecurePass123!",
            "full_name": "Alice Smith"
        }
        
        self.user2_data = {
            "username": "bob_johnson", 
            "password": "MyPassword456!",
            "full_name": "Bob Johnson"
        }
        
        # Store tokens and user info
        self.user1_token = None
        self.user2_token = None
        self.user1_info = None
        self.user2_info = None
        
        # Test results
        self.test_results = {
            "authentication": {"passed": 0, "failed": 0, "errors": []},
            "wallet_management": {"passed": 0, "failed": 0, "errors": []},
            "send_money": {"passed": 0, "failed": 0, "errors": []},
            "transaction_history": {"passed": 0, "failed": 0, "errors": []},
            "user_profile": {"passed": 0, "failed": 0, "errors": []}
        }

    def log_result(self, category: str, test_name: str, success: bool, error_msg: str = ""):
        """Log test result"""
        if success:
            self.test_results[category]["passed"] += 1
            print(f"✅ {test_name}")
        else:
            self.test_results[category]["failed"] += 1
            self.test_results[category]["errors"].append(f"{test_name}: {error_msg}")
            print(f"❌ {test_name}: {error_msg}")

    def make_request(self, method: str, endpoint: str, data: Dict = None, token: str = None) -> tuple:
        """Make HTTP request and return (success, response_data, status_code)"""
        url = f"{self.api_url}{endpoint}"
        headers = {"Content-Type": "application/json"}
        
        if token:
            headers["Authorization"] = f"Bearer {token}"
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, timeout=10)
            elif method.upper() == "POST":
                response = requests.post(url, json=data, headers=headers, timeout=10)
            else:
                return False, f"Unsupported method: {method}", 0
            
            try:
                response_data = response.json()
            except:
                response_data = {"message": response.text}
            
            return response.status_code < 400, response_data, response.status_code
            
        except requests.exceptions.RequestException as e:
            return False, f"Request failed: {str(e)}", 0

    def test_backend_health(self):
        """Test if backend is running"""
        print("\n🏥 Testing Backend Health...")
        success, data, status = self.make_request("GET", "/")
        
        if success and status == 200:
            print(f"✅ Backend is running: {data.get('message', 'OK')}")
            return True
        else:
            print(f"❌ Backend health check failed: {data}")
            return False

    def test_authentication(self):
        """Test user registration and login"""
        print("\n🔐 Testing Authentication...")
        
        # Test User Registration
        print("\n--- User Registration ---")
        
        # Register User 1
        success, data, status = self.make_request("POST", "/auth/register", self.user1_data)
        if success and status == 200:
            self.user1_token = data.get("access_token")
            self.user1_info = data.get("user")
            expected_balance = 1000.0
            actual_balance = self.user1_info.get("wallet_balance")
            
            if actual_balance == expected_balance:
                self.log_result("authentication", "User1 registration with correct starting balance", True)
            else:
                self.log_result("authentication", "User1 registration balance check", False, 
                              f"Expected {expected_balance}, got {actual_balance}")
        else:
            self.log_result("authentication", "User1 registration", False, f"Status: {status}, Data: {data}")
        
        # Register User 2
        success, data, status = self.make_request("POST", "/auth/register", self.user2_data)
        if success and status == 200:
            self.user2_token = data.get("access_token")
            self.user2_info = data.get("user")
            expected_balance = 1000.0
            actual_balance = self.user2_info.get("wallet_balance")
            
            if actual_balance == expected_balance:
                self.log_result("authentication", "User2 registration with correct starting balance", True)
            else:
                self.log_result("authentication", "User2 registration balance check", False,
                              f"Expected {expected_balance}, got {actual_balance}")
        else:
            self.log_result("authentication", "User2 registration", False, f"Status: {status}, Data: {data}")
        
        # Test duplicate registration
        success, data, status = self.make_request("POST", "/auth/register", self.user1_data)
        if not success and status == 400:
            self.log_result("authentication", "Duplicate username rejection", True)
        else:
            self.log_result("authentication", "Duplicate username rejection", False, 
                          f"Should have failed with 400, got {status}")
        
        # Test User Login
        print("\n--- User Login ---")
        
        # Valid login User 1
        login_data = {"username": self.user1_data["username"], "password": self.user1_data["password"]}
        success, data, status = self.make_request("POST", "/auth/login", login_data)
        if success and status == 200 and data.get("access_token"):
            self.log_result("authentication", "User1 valid login", True)
        else:
            self.log_result("authentication", "User1 valid login", False, f"Status: {status}, Data: {data}")
        
        # Invalid login
        invalid_login = {"username": self.user1_data["username"], "password": "wrongpassword"}
        success, data, status = self.make_request("POST", "/auth/login", invalid_login)
        if not success and status == 401:
            self.log_result("authentication", "Invalid password rejection", True)
        else:
            self.log_result("authentication", "Invalid password rejection", False,
                          f"Should have failed with 401, got {status}")

    def test_user_profile(self):
        """Test user profile and search endpoints"""
        print("\n👤 Testing User Profile & Search...")
        
        if not self.user1_token:
            self.log_result("user_profile", "User profile test", False, "No user1 token available")
            return
        
        # Test get profile
        success, data, status = self.make_request("GET", "/user/profile", token=self.user1_token)
        if success and status == 200:
            profile = data
            if (profile.get("username") == self.user1_data["username"] and 
                profile.get("full_name") == self.user1_data["full_name"]):
                self.log_result("user_profile", "Get user profile", True)
            else:
                self.log_result("user_profile", "Get user profile data validation", False,
                              f"Profile data mismatch: {profile}")
        else:
            self.log_result("user_profile", "Get user profile", False, f"Status: {status}, Data: {data}")
        
        # Test user search - valid user
        success, data, status = self.make_request("GET", f"/user/search/{self.user2_data['username']}", 
                                                token=self.user1_token)
        if success and status == 200:
            if data.get("username") == self.user2_data["username"]:
                self.log_result("user_profile", "Search existing user", True)
            else:
                self.log_result("user_profile", "Search existing user data", False, f"Wrong user data: {data}")
        else:
            self.log_result("user_profile", "Search existing user", False, f"Status: {status}, Data: {data}")
        
        # Test user search - invalid user
        success, data, status = self.make_request("GET", "/user/search/nonexistentuser", 
                                                token=self.user1_token)
        if not success and status == 404:
            self.log_result("user_profile", "Search non-existent user rejection", True)
        else:
            self.log_result("user_profile", "Search non-existent user rejection", False,
                          f"Should have failed with 404, got {status}")

    def test_wallet_management(self):
        """Test wallet top-up functionality"""
        print("\n💰 Testing Wallet Management...")
        
        if not self.user1_token:
            self.log_result("wallet_management", "Wallet management test", False, "No user1 token available")
            return
        
        # Get initial balance
        success, profile_data, status = self.make_request("GET", "/user/profile", token=self.user1_token)
        if not success:
            self.log_result("wallet_management", "Get initial balance", False, "Could not fetch profile")
            return
        
        initial_balance = profile_data.get("wallet_balance", 0)
        topup_amount = 500.0
        
        # Test valid top-up
        topup_data = {"amount": topup_amount}
        success, data, status = self.make_request("POST", "/wallet/topup", topup_data, token=self.user1_token)
        
        if success and status == 200:
            expected_balance = initial_balance + topup_amount
            actual_balance = data.get("new_balance")
            
            if actual_balance == expected_balance:
                self.log_result("wallet_management", f"Wallet top-up ${topup_amount}", True)
                
                # Verify balance in profile
                success, profile_data, status = self.make_request("GET", "/user/profile", token=self.user1_token)
                if success and profile_data.get("wallet_balance") == expected_balance:
                    self.log_result("wallet_management", "Balance persistence after top-up", True)
                else:
                    self.log_result("wallet_management", "Balance persistence after top-up", False,
                                  f"Profile balance {profile_data.get('wallet_balance')} != expected {expected_balance}")
            else:
                self.log_result("wallet_management", f"Wallet top-up balance calculation", False,
                              f"Expected {expected_balance}, got {actual_balance}")
        else:
            self.log_result("wallet_management", f"Wallet top-up ${topup_amount}", False, 
                          f"Status: {status}, Data: {data}")
        
        # Test invalid top-up (negative amount)
        invalid_topup = {"amount": -100.0}
        success, data, status = self.make_request("POST", "/wallet/topup", invalid_topup, token=self.user1_token)
        if not success and status == 400:
            self.log_result("wallet_management", "Negative amount rejection", True)
        else:
            self.log_result("wallet_management", "Negative amount rejection", False,
                          f"Should have failed with 400, got {status}")
        
        # Test zero amount
        zero_topup = {"amount": 0.0}
        success, data, status = self.make_request("POST", "/wallet/topup", zero_topup, token=self.user1_token)
        if not success and status == 400:
            self.log_result("wallet_management", "Zero amount rejection", True)
        else:
            self.log_result("wallet_management", "Zero amount rejection", False,
                          f"Should have failed with 400, got {status}")

    def test_send_money(self):
        """Test send money functionality"""
        print("\n💸 Testing Send Money...")
        
        if not self.user1_token or not self.user2_token:
            self.log_result("send_money", "Send money test", False, "Missing user tokens")
            return
        
        # Get initial balances
        success1, user1_profile, status1 = self.make_request("GET", "/user/profile", token=self.user1_token)
        success2, user2_profile, status2 = self.make_request("GET", "/user/profile", token=self.user2_token)
        
        if not (success1 and success2):
            self.log_result("send_money", "Get initial balances", False, "Could not fetch user profiles")
            return
        
        user1_initial = user1_profile.get("wallet_balance")
        user2_initial = user2_profile.get("wallet_balance")
        send_amount = 200.0
        
        # Test valid money transfer
        send_data = {
            "recipient_username": self.user2_data["username"],
            "amount": send_amount,
            "note": "Test payment from Alice to Bob"
        }
        
        success, data, status = self.make_request("POST", "/transaction/send", send_data, token=self.user1_token)
        
        if success and status == 200:
            expected_user1_balance = user1_initial - send_amount
            actual_user1_balance = data.get("new_balance")
            
            if actual_user1_balance == expected_user1_balance:
                self.log_result("send_money", f"Send ${send_amount} - sender balance update", True)
                
                # Verify recipient balance
                success, user2_profile, status = self.make_request("GET", "/user/profile", token=self.user2_token)
                if success:
                    expected_user2_balance = user2_initial + send_amount
                    actual_user2_balance = user2_profile.get("wallet_balance")
                    
                    if actual_user2_balance == expected_user2_balance:
                        self.log_result("send_money", f"Send ${send_amount} - recipient balance update", True)
                    else:
                        self.log_result("send_money", f"Send ${send_amount} - recipient balance", False,
                                      f"Expected {expected_user2_balance}, got {actual_user2_balance}")
                else:
                    self.log_result("send_money", "Verify recipient balance", False, "Could not fetch recipient profile")
            else:
                self.log_result("send_money", f"Send ${send_amount} - sender balance", False,
                              f"Expected {expected_user1_balance}, got {actual_user1_balance}")
        else:
            self.log_result("send_money", f"Send ${send_amount}", False, f"Status: {status}, Data: {data}")
        
        # Test insufficient balance
        large_amount = {"recipient_username": self.user2_data["username"], "amount": 999999.0, "note": "Too much"}
        success, data, status = self.make_request("POST", "/transaction/send", large_amount, token=self.user1_token)
        if not success and status == 400:
            self.log_result("send_money", "Insufficient balance rejection", True)
        else:
            self.log_result("send_money", "Insufficient balance rejection", False,
                          f"Should have failed with 400, got {status}")
        
        # Test send to non-existent user
        invalid_recipient = {"recipient_username": "nonexistentuser", "amount": 50.0, "note": "Invalid"}
        success, data, status = self.make_request("POST", "/transaction/send", invalid_recipient, token=self.user1_token)
        if not success and status == 404:
            self.log_result("send_money", "Invalid recipient rejection", True)
        else:
            self.log_result("send_money", "Invalid recipient rejection", False,
                          f"Should have failed with 404, got {status}")
        
        # Test send to self
        self_send = {"recipient_username": self.user1_data["username"], "amount": 50.0, "note": "To myself"}
        success, data, status = self.make_request("POST", "/transaction/send", self_send, token=self.user1_token)
        if not success and status == 400:
            self.log_result("send_money", "Send to self rejection", True)
        else:
            self.log_result("send_money", "Send to self rejection", False,
                          f"Should have failed with 400, got {status}")

    def test_transaction_history(self):
        """Test transaction history functionality"""
        print("\n📊 Testing Transaction History...")
        
        if not self.user1_token or not self.user2_token:
            self.log_result("transaction_history", "Transaction history test", False, "Missing user tokens")
            return
        
        # Test User 1 transaction history
        success, data, status = self.make_request("GET", "/transaction/history", token=self.user1_token)
        
        if success and status == 200:
            transactions = data
            if isinstance(transactions, list):
                self.log_result("transaction_history", "User1 transaction history retrieval", True)
                
                # Check for expected transaction types
                has_topup = any(txn.get("type") == "topup" for txn in transactions)
                has_send = any(txn.get("type") == "send" for txn in transactions)
                
                if has_topup:
                    self.log_result("transaction_history", "User1 has top-up transaction", True)
                else:
                    self.log_result("transaction_history", "User1 has top-up transaction", False, "No top-up found")
                
                if has_send:
                    self.log_result("transaction_history", "User1 has send transaction", True)
                else:
                    self.log_result("transaction_history", "User1 has send transaction", False, "No send found")
                
                # Check sorting (newest first)
                if len(transactions) > 1:
                    timestamps = [txn.get("timestamp") for txn in transactions if txn.get("timestamp")]
                    if len(timestamps) > 1:
                        is_sorted = all(timestamps[i] >= timestamps[i+1] for i in range(len(timestamps)-1))
                        if is_sorted:
                            self.log_result("transaction_history", "Transactions sorted by timestamp", True)
                        else:
                            self.log_result("transaction_history", "Transactions sorted by timestamp", False,
                                          "Transactions not in descending order")
            else:
                self.log_result("transaction_history", "User1 transaction history format", False,
                              f"Expected list, got {type(transactions)}")
        else:
            self.log_result("transaction_history", "User1 transaction history retrieval", False,
                          f"Status: {status}, Data: {data}")
        
        # Test User 2 transaction history
        success, data, status = self.make_request("GET", "/transaction/history", token=self.user2_token)
        
        if success and status == 200:
            transactions = data
            if isinstance(transactions, list):
                self.log_result("transaction_history", "User2 transaction history retrieval", True)
                
                # User 2 should have receive transaction
                has_receive = any(txn.get("type") == "receive" for txn in transactions)
                if has_receive:
                    self.log_result("transaction_history", "User2 has receive transaction", True)
                else:
                    self.log_result("transaction_history", "User2 has receive transaction", False, "No receive found")
            else:
                self.log_result("transaction_history", "User2 transaction history format", False,
                              f"Expected list, got {type(transactions)}")
        else:
            self.log_result("transaction_history", "User2 transaction history retrieval", False,
                          f"Status: {status}, Data: {data}")

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting VeloraPay Backend API Tests")
        print("=" * 50)
        
        # Check backend health first
        if not self.test_backend_health():
            print("❌ Backend is not responding. Aborting tests.")
            return False
        
        # Run all test suites
        self.test_authentication()
        self.test_user_profile()
        self.test_wallet_management()
        self.test_send_money()
        self.test_transaction_history()
        
        # Print summary
        self.print_summary()
        
        return self.get_overall_success()

    def print_summary(self):
        """Print test results summary"""
        print("\n" + "=" * 50)
        print("📋 TEST RESULTS SUMMARY")
        print("=" * 50)
        
        total_passed = 0
        total_failed = 0
        
        for category, results in self.test_results.items():
            passed = results["passed"]
            failed = results["failed"]
            total_passed += passed
            total_failed += failed
            
            status = "✅" if failed == 0 else "❌"
            print(f"{status} {category.replace('_', ' ').title()}: {passed} passed, {failed} failed")
            
            if results["errors"]:
                for error in results["errors"]:
                    print(f"   • {error}")
        
        print("-" * 50)
        overall_status = "✅ ALL TESTS PASSED" if total_failed == 0 else f"❌ {total_failed} TESTS FAILED"
        print(f"OVERALL: {total_passed} passed, {total_failed} failed - {overall_status}")
        print("=" * 50)

    def get_overall_success(self):
        """Return True if all tests passed"""
        return all(results["failed"] == 0 for results in self.test_results.values())

if __name__ == "__main__":
    tester = VeloraPayTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All backend tests completed successfully!")
        exit(0)
    else:
        print("\n💥 Some backend tests failed. Check the summary above.")
        exit(1)