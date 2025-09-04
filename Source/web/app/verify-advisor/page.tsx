'use client';

import { useState } from 'react';

interface VerificationResult {
  exists: boolean;
  nameScore?: number;
  advisor?: {
    registration_id: string;
    name: string;
    status: string;
    registration_date?: string;
    category?: string;
  };
  error?: string;
}

export default function VerifyAdvisorPage() {
  const [formData, setFormData] = useState({
    registrationId: '',
    name: ''
  });
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.registrationId || !formData.name) {
      alert('Please fill in all required fields');
      return;
    }
    
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/verify-advisor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error:', error);
      setResult({ exists: false, error: 'Failed to verify advisor' });
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    if (score >= 40) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4">
        {/* Header Section */}
        <div className="text-center mb-8 max-w-2xl">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Verify Investment Advisor</h1>
          </div>
          <p className="text-gray-600 text-lg">Verify SEBI registered investment advisors</p>
        </div>

        {/* Form Section */}
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-center mb-6">
            <svg className="w-6 h-6 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-900">Advisor Verification</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <div className="w-4 h-4 bg-purple-500 rounded mr-2"></div>
                SEBI Registration ID
              </label>
              <input
                type="text"
                value={formData.registrationId}
                onChange={(e) => setFormData({...formData, registrationId: e.target.value})}
                placeholder="Enter SEBI registration ID (e.g., INA000000123)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
                Advisor Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Enter advisor name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying...
                </>
              ) : (
                'Verify Advisor'
              )}
            </button>
          </form>

          {/* Results Section */}
          {result && (
            <div className="mt-8 p-6 bg-gray-50 rounded-lg">
              {'error' in result && result.error ? (
                <div className="text-red-600 text-center">
                  <span className="font-medium px-4 py-2 bg-red-200 rounded-2xl">Not Found</span>
                  <p className="text-sm mt-4">{result.error}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className={`inline-flex items-center px-4 py-2 rounded-full font-medium ${
                      result.exists ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'
                    }`}>
                      {result.exists ? 'Registration ID Exists' : 'Registration ID Not Found'}
                    </div>
                  </div>
                  
                  {result.exists && result.advisor && (
                    <>
                      <div className="border-t pt-4">
                        <h3 className="font-medium text-gray-900 mb-2">Advisor Information</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Registration ID:</span>
                            <p className="font-medium">{result.advisor.registration_id}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Name:</span>
                            <p className="font-medium">{result.advisor.name}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Status:</span>
                            <p className="font-medium">{result.advisor.status}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Category:</span>
                            <p className="font-medium">{result.advisor.category || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                      
                      {result.nameScore !== undefined && (
                        <div className="border-t pt-4">
                          <h3 className="font-medium text-gray-900 mb-2">Name Similarity Score</h3>
                          <div className="text-center">
                            <div className={`inline-flex items-center px-4 py-2 rounded-full font-medium ${getScoreColor(result.nameScore)}`}>
                              {result.nameScore}% Match
                            </div>
                            <p className="text-sm text-gray-600 mt-2">
                              {result.nameScore >= 80 ? 'Excellent match' : 
                               result.nameScore >= 60 ? 'Good match' :
                               result.nameScore >= 40 ? 'Moderate match' : 'Poor match'}
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
