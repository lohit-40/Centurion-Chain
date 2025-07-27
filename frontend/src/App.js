import React, { useState, useEffect } from 'react';
import { showConnect } from '@stacks/connect';
import { AppConfig, UserSession } from '@stacks/auth';
import { StacksTestnet } from '@stacks/network';
import { 
  makeContractCall, 
  bufferCVFromString, 
  stringAsciiCV, 
  uintCV, 
  standardPrincipalCV 
} from '@stacks/transactions';
import { QRCodeSVG } from 'qrcode.react';
import './App.css';

const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

// Contract details - Update these with your deployed contract
const CONTRACT_ADDRESS = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'; // Replace with actual deployed contract address
const CONTRACT_NAME = 'shikshachain-degrees';

function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [universities, setUniversities] = useState([]);
  const [degrees, setDegrees] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // Form states
  const [universityForm, setUniversityForm] = useState({
    name: '',
    principal_address: ''
  });
  const [studentForm, setStudentForm] = useState({
    name: '',
    wallet_address: '',
    aadhaar_id: ''
  });
  const [degreeForm, setDegreeForm] = useState({
    student_id: '',
    student_name: '',
    student_wallet_address: '',
    course: '',
    graduation_year: new Date().getFullYear(),
    university_id: '',
    sgpa: '',
    cgpa: '',
    degree_pdf_base64: ''
  });
  const [verificationId, setVerificationId] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    if (userSession.isSignInPending()) {
      userSession.handlePendingSignIn().then((userData) => {
        setUser(userData);
      });
    } else if (userSession.isUserSignedIn()) {
      setUser(userSession.loadUserData());
    }
    
    // Load initial data
    loadUniversities();
    loadDegrees();
  }, []);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const connectWallet = () => {
    showConnect({
      appDetails: {
        name: 'ShikshaChain',
        icon: window.location.origin + '/logo192.png',
      },
      redirectTo: '/',
      onFinish: () => {
        window.location.reload();
      },
      userSession,
    });
  };

  const disconnect = () => {
    userSession.signUserOut('/');
    setUser(null);
  };

  const loadUniversities = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/universities`);
      const data = await response.json();
      setUniversities(data.universities || []);
    } catch (error) {
      console.error('Error loading universities:', error);
    }
  };

  const loadDegrees = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/degrees`);
      const data = await response.json();
      setDegrees(data.degrees || []);
    } catch (error) {
      console.error('Error loading degrees:', error);
    }
  };

  const createUniversity = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const university = {
        id: Date.now().toString(),
        ...universityForm
      };
      
      const response = await fetch(`${BACKEND_URL}/api/universities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(university)
      });
      
      if (response.ok) {
        showNotification('University registered successfully!');
        setUniversityForm({ name: '', principal_address: '' });
        loadUniversities();
      } else {
        const error = await response.json();
        showNotification(error.detail, 'error');
      }
    } catch (error) {
      showNotification('Error creating university: ' + error.message, 'error');
    }
    setLoading(false);
  };

  const createStudent = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const student = {
        id: Date.now().toString(),
        ...studentForm
      };
      
      const response = await fetch(`${BACKEND_URL}/api/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(student)
      });
      
      if (response.ok) {
        showNotification('Student registered successfully!');
        setStudentForm({ name: '', wallet_address: '', aadhaar_id: '' });
      } else {
        const error = await response.json();
        showNotification(error.detail, 'error');
      }
    } catch (error) {
      showNotification('Error creating student: ' + error.message, 'error');
    }
    setLoading(false);
  };

  const mintDegree = async (e) => {
    e.preventDefault();
    if (!user) {
      showNotification('Please connect your wallet first', 'error');
      return;
    }
    
    setLoading(true);
    try {
      // First mint in our database
      const response = await fetch(`${BACKEND_URL}/api/degrees/mint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(degreeForm)
      });
      
      if (response.ok) {
        const data = await response.json();
        showNotification('Degree NFT minted successfully!');
        setDegreeForm({
          student_id: '',
          student_name: '',
          student_wallet_address: '',
          course: '',
          graduation_year: new Date().getFullYear(),
          university_id: '',
          sgpa: '',
          cgpa: '',
          degree_pdf_base64: ''
        });
        loadDegrees();
        
        // TODO: Integrate with actual Stacks contract call
        // This would involve calling the mint-degree function from the Clarity contract
        console.log('Degree minted:', data);
      } else {
        const error = await response.json();
        showNotification(error.detail, 'error');
      }
    } catch (error) {
      showNotification('Error minting degree: ' + error.message, 'error');
    }
    setLoading(false);
  };

  const verifyDegree = async () => {
    if (!verificationId) {
      showNotification('Please enter a degree ID', 'error');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/degrees/verify/${verificationId}`);
      if (response.ok) {
        const data = await response.json();
        setVerificationResult(data.verification);
        showNotification('Degree verification completed!');
      } else {
        const error = await response.json();
        showNotification(error.detail, 'error');
        setVerificationResult(null);
      }
    } catch (error) {
      showNotification('Error verifying degree: ' + error.message, 'error');
      setVerificationResult(null);
    }
    setLoading(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target.result.split(',')[1];
        setDegreeForm({ ...degreeForm, degree_pdf_base64: base64 });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          notification.type === 'error' ? 'bg-red-500' : 'bg-green-500'
        } text-white`}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg p-3 mr-4">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.84L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.84l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">ShikshaChain</h1>
                <p className="text-gray-600">Blockchain-Verified Academic Credentials</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-700">
                    Connected: {user.profile?.stxAddress?.testnet?.slice(0, 8)}...
                  </span>
                  <button
                    onClick={disconnect}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={connectWallet}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2 rounded-lg transition-colors shadow-lg"
                >
                  Connect Leather Wallet
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {['home', 'university', 'student', 'verify'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize transition-colors ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'home' ? 'Dashboard' : `${tab} Portal`}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'home' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center">
                <div className="bg-blue-100 rounded-lg p-3">
                  <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.84L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.84l-7-3z"/>
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Universities</h3>
                  <p className="text-3xl font-bold text-blue-600">{universities.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center">
                <div className="bg-green-100 rounded-lg p-3">
                  <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Degrees Issued</h3>
                  <p className="text-3xl font-bold text-green-600">{degrees.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center">
                <div className="bg-purple-100 rounded-lg p-3">
                  <svg className="w-8 h-8 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Students</h3>
                  <p className="text-3xl font-bold text-purple-600">{students.length}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'university' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">University Registration & Degree Minting</h2>
              
              {/* University Registration */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Register University</h3>
                <form onSubmit={createUniversity} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">University Name</label>
                    <input
                      type="text"
                      value={universityForm.name}
                      onChange={(e) => setUniversityForm({ ...universityForm, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., BPUT, Utkal University"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Principal Stacks Address</label>
                    <input
                      type="text"
                      value={universityForm.principal_address}
                      onChange={(e) => setUniversityForm({ ...universityForm, principal_address: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Registering...' : 'Register University'}
                  </button>
                </form>
              </div>

              {/* Student Registration */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Register Student</h3>
                <form onSubmit={createStudent} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Student Name</label>
                    <input
                      type="text"
                      value={studentForm.name}
                      onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Wallet Address</label>
                    <input
                      type="text"
                      value={studentForm.wallet_address}
                      onChange={(e) => setStudentForm({ ...studentForm, wallet_address: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Aadhaar ID</label>
                    <input
                      type="text"
                      value={studentForm.aadhaar_id}
                      onChange={(e) => setStudentForm({ ...studentForm, aadhaar_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="12-digit Aadhaar number"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Registering...' : 'Register Student'}
                  </button>
                </form>
              </div>

              {/* Degree Minting */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Mint Degree NFT</h3>
                <form onSubmit={mintDegree} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Student ID</label>
                      <input
                        type="text"
                        value={degreeForm.student_id}
                        onChange={(e) => setDegreeForm({ ...degreeForm, student_id: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Student Name</label>
                      <input
                        type="text"
                        value={degreeForm.student_name}
                        onChange={(e) => setDegreeForm({ ...degreeForm, student_name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Student Wallet Address</label>
                    <input
                      type="text"
                      value={degreeForm.student_wallet_address}
                      onChange={(e) => setDegreeForm({ ...degreeForm, student_wallet_address: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Course</label>
                      <input
                        type="text"
                        value={degreeForm.course}
                        onChange={(e) => setDegreeForm({ ...degreeForm, course: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., B.Tech Computer Science"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Graduation Year</label>
                      <input
                        type="number"
                        value={degreeForm.graduation_year}
                        onChange={(e) => setDegreeForm({ ...degreeForm, graduation_year: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="2000"
                        max={new Date().getFullYear() + 10}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">SGPA (Semester Grade Point Average)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="10"
                        value={degreeForm.sgpa}
                        onChange={(e) => setDegreeForm({ ...degreeForm, sgpa: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., 8.75"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">CGPA (Cumulative Grade Point Average)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="10"
                        value={degreeForm.cgpa}
                        onChange={(e) => setDegreeForm({ ...degreeForm, cgpa: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., 8.50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">University</label>
                    <select
                      value={degreeForm.university_id}
                      onChange={(e) => setDegreeForm({ ...degreeForm, university_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select University</option>
                      {universities.map((uni) => (
                        <option key={uni.id} value={uni.id}>{uni.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Degree Certificate (PDF)</label>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileUpload}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !user}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Minting...' : 'Mint Degree NFT'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'student' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Student Dashboard</h2>
              
              {degrees.length > 0 ? (
                <div className="space-y-6">
                  {degrees.map((degree) => (
                    <div key={degree.id} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{degree.course}</h3>
                          <p className="text-gray-600">{degree.university_name}</p>
                          <p className="text-sm text-gray-500">Graduated: {degree.graduation_year}</p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            degree.verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {degree.verified ? 'Verified' : 'Pending'}
                          </span>
                          <p className="text-sm text-gray-500 mt-1">NFT ID: {degree.degree_id}</p>
                        </div>
                      </div>
                      
                      {degree.qr_code && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Share QR Code:</h4>
                          <div className="bg-white p-4 inline-block border border-gray-200 rounded">
                            <QRCodeSVG value={degree.qr_code} size={128} />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No degrees found</h3>
                  <p className="mt-1 text-sm text-gray-500">You don't have any verified degrees yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'verify' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Verify Degree Certificate</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Degree NFT ID</label>
                  <input
                    type="text"
                    value={verificationId}
                    onChange={(e) => setVerificationId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter degree NFT ID from QR code"
                  />
                </div>
                <button
                  onClick={verifyDegree}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Verify Degree'}
                </button>
              </div>

              {verificationResult && (
                <div className="mt-8 border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Verification Result</h3>
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Student Name</p>
                        <p className="text-gray-900">{verificationResult.student_name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Course</p>
                        <p className="text-gray-900">{verificationResult.course}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">University</p>
                        <p className="text-gray-900">{verificationResult.university}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Graduation Year</p>
                        <p className="text-gray-900">{verificationResult.graduation_year}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Verification Status</p>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          verificationResult.verified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {verificationResult.verified ? 'VERIFIED ✓' : 'NOT VERIFIED ✗'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">University Status</p>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          verificationResult.university_authorized ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {verificationResult.university_authorized ? 'AUTHORIZED' : 'NOT AUTHORIZED'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;