#!/usr/bin/env python3
"""
ShikshaChain Backend API Testing Suite
Tests the complete blockchain degree verification workflow
"""

import requests
import json
import uuid
import base64
from datetime import datetime
import time

# Use the external backend URL from frontend/.env
BASE_URL = "https://e1a3bdda-0a6b-4170-adc8-b66eca5f48b9.preview.emergentagent.com/api"

class ShikshaChainTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_data = {}
        
    def log_test(self, test_name, status, details=""):
        """Log test results"""
        status_symbol = "✅" if status else "❌"
        print(f"{status_symbol} {test_name}")
        if details:
            print(f"   Details: {details}")
        if not status:
            print(f"   Failed test: {test_name}")
        print()
        
    def test_health_check(self):
        """Test API health endpoint"""
        try:
            response = self.session.get(f"{BASE_URL}/health")
            if response.status_code == 200:
                data = response.json()
                self.log_test("Health Check", True, f"Status: {data.get('status')}")
                return True
            else:
                self.log_test("Health Check", False, f"Status code: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Health Check", False, f"Exception: {str(e)}")
            return False
    
    def test_university_crud(self):
        """Test University CRUD operations"""
        print("=== Testing University CRUD Operations ===")
        
        # Test 1: Create University (BPUT)
        university_data = {
            "id": str(uuid.uuid4()),
            "name": "Biju Patnaik University of Technology",
            "principal_address": f"SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ{uuid.uuid4().hex[:1].upper()}",
            "authorized": True
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/universities", json=university_data)
            if response.status_code == 200:
                result = response.json()
                self.test_data['university'] = result['university']
                self.log_test("Create University (BPUT)", True, f"University ID: {university_data['id']}")
            else:
                self.log_test("Create University (BPUT)", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Create University (BPUT)", False, f"Exception: {str(e)}")
            return False
        
        # Test 2: Get All Universities
        try:
            response = self.session.get(f"{BASE_URL}/universities")
            if response.status_code == 200:
                result = response.json()
                universities = result.get('universities', [])
                self.log_test("Get All Universities", True, f"Found {len(universities)} universities")
            else:
                self.log_test("Get All Universities", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Get All Universities", False, f"Exception: {str(e)}")
            return False
        
        # Test 3: Get University by ID
        try:
            university_id = self.test_data['university']['id']
            response = self.session.get(f"{BASE_URL}/universities/{university_id}")
            if response.status_code == 200:
                result = response.json()
                university = result.get('university')
                self.log_test("Get University by ID", True, f"Retrieved: {university['name']}")
            else:
                self.log_test("Get University by ID", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Get University by ID", False, f"Exception: {str(e)}")
            return False
        
        # Test 4: Duplicate University Prevention
        try:
            response = self.session.post(f"{BASE_URL}/universities", json=university_data)
            if response.status_code == 400:
                self.log_test("Duplicate University Prevention", True, "Correctly rejected duplicate")
            else:
                self.log_test("Duplicate University Prevention", False, f"Should have rejected duplicate, got: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Duplicate University Prevention", False, f"Exception: {str(e)}")
            return False
        
        return True
    
    def test_student_crud(self):
        """Test Student CRUD operations"""
        print("=== Testing Student CRUD Operations ===")
        
        # Test 1: Create Student
        student_data = {
            "id": str(uuid.uuid4()),
            "name": "Rajesh Kumar Singh",
            "wallet_address": f"SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8YJ5GHZ{uuid.uuid4().hex[:1].upper()}",
            "aadhaar_id": f"{uuid.uuid4().int % 1000000000000:012d}"
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/students", json=student_data)
            if response.status_code == 200:
                result = response.json()
                self.test_data['student'] = result['student']
                self.log_test("Create Student", True, f"Student: {student_data['name']}")
            else:
                self.log_test("Create Student", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Create Student", False, f"Exception: {str(e)}")
            return False
        
        # Test 2: Get Student by ID
        try:
            student_id = self.test_data['student']['id']
            response = self.session.get(f"{BASE_URL}/students/{student_id}")
            if response.status_code == 200:
                result = response.json()
                student = result.get('student')
                self.log_test("Get Student by ID", True, f"Retrieved: {student['name']}")
            else:
                self.log_test("Get Student by ID", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Get Student by ID", False, f"Exception: {str(e)}")
            return False
        
        # Test 3: Get Student by Wallet Address
        try:
            wallet_address = self.test_data['student']['wallet_address']
            response = self.session.get(f"{BASE_URL}/students/wallet/{wallet_address}")
            if response.status_code == 200:
                result = response.json()
                student = result.get('student')
                self.log_test("Get Student by Wallet", True, f"Retrieved: {student['name']}")
            else:
                self.log_test("Get Student by Wallet", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Get Student by Wallet", False, f"Exception: {str(e)}")
            return False
        
        # Test 4: Duplicate Student Prevention
        try:
            response = self.session.post(f"{BASE_URL}/students", json=student_data)
            if response.status_code == 400:
                self.log_test("Duplicate Student Prevention", True, "Correctly rejected duplicate")
            else:
                self.log_test("Duplicate Student Prevention", False, f"Should have rejected duplicate, got: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Duplicate Student Prevention", False, f"Exception: {str(e)}")
            return False
        
        return True
    
    def test_aadhaar_verification(self):
        """Test Mock Aadhaar verification"""
        print("=== Testing Mock Aadhaar Verification ===")
        
        # Test 1: Valid Aadhaar
        try:
            data = {
                "aadhaar_id": "123456789012",
                "name": "Rajesh Kumar Singh"
            }
            response = self.session.post(f"{BASE_URL}/auth/verify-aadhaar", data=data)
            if response.status_code == 200:
                result = response.json()
                if result.get('verified'):
                    self.log_test("Valid Aadhaar Verification", True, f"Verified: {result.get('name')}")
                else:
                    self.log_test("Valid Aadhaar Verification", False, "Should have been verified")
                    return False
            else:
                self.log_test("Valid Aadhaar Verification", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Valid Aadhaar Verification", False, f"Exception: {str(e)}")
            return False
        
        # Test 2: Invalid Aadhaar
        try:
            data = {
                "aadhaar_id": "12345",  # Invalid length
                "name": "Test User"
            }
            response = self.session.post(f"{BASE_URL}/auth/verify-aadhaar", data=data)
            if response.status_code == 200:
                result = response.json()
                if not result.get('verified'):
                    self.log_test("Invalid Aadhaar Rejection", True, "Correctly rejected invalid Aadhaar")
                else:
                    self.log_test("Invalid Aadhaar Rejection", False, "Should have rejected invalid Aadhaar")
                    return False
            else:
                self.log_test("Invalid Aadhaar Rejection", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Invalid Aadhaar Rejection", False, f"Exception: {str(e)}")
            return False
        
        return True
    
    def test_degree_minting(self):
        """Test Degree NFT minting system"""
        print("=== Testing Degree NFT Minting System ===")
        
        if 'university' not in self.test_data or 'student' not in self.test_data:
            self.log_test("Degree Minting Prerequisites", False, "University and Student must be created first")
            return False
        
        # Create sample PDF data (base64 encoded)
        sample_pdf_content = "Sample degree certificate content for testing"
        pdf_base64 = base64.b64encode(sample_pdf_content.encode()).decode()
        
        degree_request = {
            "student_id": self.test_data['student']['id'],
            "student_name": self.test_data['student']['name'],
            "student_wallet_address": self.test_data['student']['wallet_address'],
            "course": "Bachelor of Technology in Computer Science",
            "graduation_year": 2024,
            "university_id": self.test_data['university']['id'],
            "degree_pdf_base64": pdf_base64
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/degrees/mint", json=degree_request)
            if response.status_code == 200:
                result = response.json()
                degree = result.get('degree')
                qr_data = result.get('qr_data')
                
                if degree and qr_data:
                    self.test_data['degree'] = degree
                    self.test_data['qr_data'] = qr_data
                    self.log_test("Mint Degree NFT", True, f"Degree ID: {degree['degree_id']}, QR generated")
                    
                    # Verify QR data contains required fields
                    required_qr_fields = ['degree_id', 'student_name', 'course', 'university', 'graduation_year', 'verification_url']
                    missing_fields = [field for field in required_qr_fields if field not in qr_data]
                    
                    if not missing_fields:
                        self.log_test("QR Code Data Validation", True, "All required fields present")
                    else:
                        self.log_test("QR Code Data Validation", False, f"Missing fields: {missing_fields}")
                        return False
                else:
                    self.log_test("Mint Degree NFT", False, "Missing degree or QR data in response")
                    return False
            else:
                self.log_test("Mint Degree NFT", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Mint Degree NFT", False, f"Exception: {str(e)}")
            return False
        
        return True
    
    def test_degree_verification(self):
        """Test Degree verification API"""
        print("=== Testing Degree Verification API ===")
        
        if 'degree' not in self.test_data:
            self.log_test("Degree Verification Prerequisites", False, "Degree must be minted first")
            return False
        
        degree_id = self.test_data['degree']['degree_id']
        
        # Test 1: Valid Degree Verification
        try:
            response = self.session.get(f"{BASE_URL}/degrees/verify/{degree_id}")
            if response.status_code == 200:
                result = response.json()
                verification = result.get('verification')
                
                if verification:
                    required_fields = ['degree_id', 'student_name', 'course', 'university', 'graduation_year', 'verified', 'student_wallet', 'university_authorized']
                    missing_fields = [field for field in required_fields if field not in verification]
                    
                    if not missing_fields:
                        self.log_test("Degree Verification", True, f"Verified degree for {verification['student_name']}")
                        
                        # Check if degree is marked as verified
                        if verification.get('verified'):
                            self.log_test("Degree Verification Status", True, "Degree is verified")
                        else:
                            self.log_test("Degree Verification Status", False, "Degree should be verified")
                            return False
                    else:
                        self.log_test("Degree Verification", False, f"Missing verification fields: {missing_fields}")
                        return False
                else:
                    self.log_test("Degree Verification", False, "No verification data in response")
                    return False
            else:
                self.log_test("Degree Verification", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Degree Verification", False, f"Exception: {str(e)}")
            return False
        
        # Test 2: Invalid Degree ID
        try:
            invalid_degree_id = 99999999
            response = self.session.get(f"{BASE_URL}/degrees/verify/{invalid_degree_id}")
            if response.status_code == 404:
                self.log_test("Invalid Degree Verification", True, "Correctly returned 404 for invalid degree")
            else:
                self.log_test("Invalid Degree Verification", False, f"Should return 404, got: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Invalid Degree Verification", False, f"Exception: {str(e)}")
            return False
        
        return True
    
    def test_student_degrees(self):
        """Test getting degrees for a student"""
        print("=== Testing Student Degrees Retrieval ===")
        
        if 'student' not in self.test_data:
            self.log_test("Student Degrees Prerequisites", False, "Student must be created first")
            return False
        
        student_id = self.test_data['student']['id']
        wallet_address = self.test_data['student']['wallet_address']
        
        # Test 1: Get degrees by student ID
        try:
            response = self.session.get(f"{BASE_URL}/degrees/student/{student_id}")
            if response.status_code == 200:
                result = response.json()
                degrees = result.get('degrees', [])
                self.log_test("Get Degrees by Student ID", True, f"Found {len(degrees)} degrees")
            else:
                self.log_test("Get Degrees by Student ID", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Get Degrees by Student ID", False, f"Exception: {str(e)}")
            return False
        
        # Test 2: Get degrees by wallet address
        try:
            response = self.session.get(f"{BASE_URL}/degrees/wallet/{wallet_address}")
            if response.status_code == 200:
                result = response.json()
                degrees = result.get('degrees', [])
                self.log_test("Get Degrees by Wallet", True, f"Found {len(degrees)} degrees")
            else:
                self.log_test("Get Degrees by Wallet", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Get Degrees by Wallet", False, f"Exception: {str(e)}")
            return False
        
        return True
    
    def run_all_tests(self):
        """Run complete test suite"""
        print("🚀 Starting ShikshaChain Backend API Tests")
        print("=" * 50)
        
        test_results = {}
        
        # Run tests in order
        test_results['health'] = self.test_health_check()
        test_results['university_crud'] = self.test_university_crud()
        test_results['student_crud'] = self.test_student_crud()
        test_results['aadhaar_verification'] = self.test_aadhaar_verification()
        test_results['degree_minting'] = self.test_degree_minting()
        test_results['degree_verification'] = self.test_degree_verification()
        test_results['student_degrees'] = self.test_student_degrees()
        
        # Summary
        print("=" * 50)
        print("📊 TEST SUMMARY")
        print("=" * 50)
        
        passed = sum(1 for result in test_results.values() if result)
        total = len(test_results)
        
        for test_name, result in test_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{status} {test_name.replace('_', ' ').title()}")
        
        print(f"\nOverall: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed! ShikshaChain backend is working correctly.")
            return True
        else:
            print("⚠️  Some tests failed. Check the details above.")
            return False

if __name__ == "__main__":
    tester = ShikshaChainTester()
    success = tester.run_all_tests()
    exit(0 if success else 1)