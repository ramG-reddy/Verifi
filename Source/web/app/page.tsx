'use client';

import { useState } from 'react';
import { SubmissionSchema, SubmissionResult } from '@/lib/types';

export default function HomePage() {
  const [formData, setFormData] = useState<SubmissionSchema>({
    adviceText: '',
    advisorName: '',
    advisorRegId: '',
    returnPercentage: undefined,
    timeFrame: ''
  });
  
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.adviceText) {
      alert('Please fill in all required fields');
      return;
    }
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/check-advice', {
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
      setResult({ error: 'Failed to analyze advice' });
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW': return 'text-green-600 bg-green-100';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
      case 'HIGH': return 'text-orange-600 bg-orange-100';
      case 'CRITICAL': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-xl font-semibold text-gray-900">Financial Fraud Checker</span>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <a href="#" className="text-blue-600 hover:text-blue-800 px-3 py-2 rounded-md text-sm font-medium">Home</a>
                <a href="#" className="text-gray-600 hover:text-gray-800 px-3 py-2 rounded-md text-sm font-medium">Verify Advisor</a>
                <a href="#" className="text-gray-600 hover:text-gray-800 px-3 py-2 rounded-md text-sm font-medium">Check Company</a>
                <a href="#" className="text-gray-600 hover:text-gray-800 px-3 py-2 rounded-md text-sm font-medium">IPO Verification</a>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4">
        {/* Header Section */}
        <div className="text-center mb-8 max-w-2xl">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Financial Fraud Checker</h1>
          </div>
          <p className="text-gray-600 text-lg">Protect yourself from financial scams and fraudulent schemes</p>
          
          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center gap-4 mt-6">
            <div className="flex items-center text-sm">
              <div className="w-4 h-4 bg-orange-500 rounded-full mr-2"></div>
              <span className="text-gray-700">Secure & Private</span>
            </div>
            <div className="flex items-center text-sm">
              <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
              <span className="text-gray-700">SEBI Verified</span>
            </div>
            <div className="flex items-center text-sm">
              <div className="w-4 h-4 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-gray-700">Government Approved</span>
            </div>
          </div>
        </div>

        {/* Form Section */}
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-center mb-6">
            <svg className="w-6 h-6 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-900">Check for Financial Fraud</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Text Message Field */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <div className="w-4 h-4 bg-purple-500 rounded mr-2"></div>
                Text Message / SMS Content
                {/* <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Optional</span> */}
              </label>
              <textarea
                value={formData.adviceText}
                onChange={(e) => setFormData({...formData, adviceText: e.target.value})}
                placeholder="Paste suspicious SMS, WhatsApp message, or any text offering investment opportunities..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
                required
              />
            </div>

            {/* Advisor Name Field */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
                Advisor Name
                <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Optional</span>
              </label>
              <input
                type="text"
                value={formData.advisorName || ''}
                onChange={(e) => setFormData({...formData, advisorName: e.target.value})}
                placeholder="Enter advisor name to verify authenticity..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* SEBI Registration Field */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <div className="w-4 h-4 bg-purple-500 rounded mr-2"></div>
                SEBI Registration Number
                <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Optional</span>
              </label>
              <input
                type="text"
                value={formData.advisorRegId || ''}
                onChange={(e) => setFormData({...formData, advisorRegId: e.target.value})}
                placeholder="Enter SEBI registration number (e.g. INH000000123)..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Return Percentage Field */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                Promised Return Percentage
                <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Optional</span>
              </label>
              <input
                type="number"
                value={formData.returnPercentage || ''}
                onChange={(e) => setFormData({...formData, returnPercentage: e.target.value ? Number(e.target.value) : undefined})}
                placeholder="Enter promised return percentage..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Time Frame Field */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                Time Frame
                <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Optional</span>
              </label>
              <input
                type="text"
                value={formData.timeFrame || ''}
                onChange={(e) => setFormData({...formData, timeFrame: e.target.value})}
                placeholder="Enter time frame (e.g., 1 month, 3 weeks, etc.)..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Submit Button */}
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
                  Analyzing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Check for Fraud
                </>
              )}
            </button>

            {/* Disclaimer Section */}
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-amber-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-amber-800">
                    Important Disclaimer
                  </h3>
                  <div className="mt-2 text-sm text-amber-700">
                    <p>
                      This tool uses preliminary detection methods based on common fraudulent patterns and should <strong>not</strong> be considered as a definitive assessment. 
                      For complete verification, please:
                    </p>
                    <ul className="mt-2 list-disc list-inside space-y-1">
                      <li>Check advisor registration on <a href="https://www.sebi.gov.in" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">SEBI's official website</a></li>
                      <li>Verify company details through official regulatory platforms</li>
                      <li>Consult with certified financial advisors before making investment decisions</li>
                      <li>Report suspicious activities to appropriate authorities</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </form>

          {/* Results Section */}
          {result && (
            <div className="mt-8 p-6 bg-gray-50 rounded-lg">
              {'error' in result ? (
                <div className="text-red-600 text-center">
                  <p className="font-medium">Error</p>
                  <p className="text-sm">{result.error}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className={`inline-flex items-center px-4 py-2 rounded-full font-medium ${getRiskColor(result.riskLevel)}`}>
                      Risk Level: {result.riskLevel}
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      Score: {result.finalScore}/100
                    </p>
                  </div>
                  
                  <div className="border-t pt-4">
                    <h3 className="font-medium text-gray-900 mb-2">Advisor Verification</h3>
                    <p className="text-sm text-gray-600">{result.advisorVerification.message}</p>
                  </div>
                  
                  {result.detectedRedFlags.length > 0 && (
                    <div className="border-t pt-4">
                      <h3 className="font-medium text-gray-900 mb-2">Detected Red Flags</h3>
                      <div className="space-y-2">
                        {result.detectedRedFlags.map((flag, index) => (
                          <div key={index} className="text-sm">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getRiskColor(flag.severity)}`}>
                              {flag.severity}
                            </span>
                            <span className="ml-2 text-gray-700">{flag.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
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
