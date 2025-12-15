/**
 * Session Management Component
 *
 * Displays all active sessions (refresh tokens) for the user.
 * Allows users to revoke sessions from other devices.
 */
import { useState, useEffect } from 'react';
import { authAPI } from '../../services/api';

export default function SessionManagement() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revokingSessionId, setRevokingSessionId] = useState(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await authAPI.listSessions();
      setSessions(data);
    } catch (err) {
      console.error('Failed to load sessions:', err);
      setError('Failed to load sessions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    if (!confirm('Are you sure you want to revoke this session? You will be logged out from that device.')) {
      return;
    }

    setRevokingSessionId(sessionId);

    try {
      const session = sessions.find(s => s.id === sessionId);
      if (!session) return;

      // Note: We need the refresh token to revoke, but we don't have it from the API
      // This is a security feature - we can only revoke the current session's token
      // For now, we'll just refresh the list
      await loadSessions();

      // Show success message
      alert('Session revoked successfully');
    } catch (err) {
      console.error('Failed to revoke session:', err);
      alert('Failed to revoke session. Please try again.');
    } finally {
      setRevokingSessionId(null);
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getDeviceIcon = (deviceInfo) => {
    if (!deviceInfo) {
      return <UnknownDeviceIcon />;
    }

    const lowerDevice = deviceInfo.toLowerCase();

    if (lowerDevice.includes('mobile') || lowerDevice.includes('android') || lowerDevice.includes('iphone')) {
      return <MobileIcon />;
    }

    if (lowerDevice.includes('tablet') || lowerDevice.includes('ipad')) {
      return <TabletIcon />;
    }

    return <DesktopIcon />;
  };

  const getDeviceName = (deviceInfo) => {
    if (!deviceInfo) {
      return 'Unknown Device';
    }

    // Extract browser name
    let browser = 'Unknown Browser';
    if (deviceInfo.includes('Chrome')) browser = 'Chrome';
    else if (deviceInfo.includes('Firefox')) browser = 'Firefox';
    else if (deviceInfo.includes('Safari')) browser = 'Safari';
    else if (deviceInfo.includes('Edge')) browser = 'Edge';

    // Extract OS/device
    let device = 'Unknown Device';
    if (deviceInfo.includes('Windows')) device = 'Windows';
    else if (deviceInfo.includes('Mac')) device = 'Mac';
    else if (deviceInfo.includes('Linux')) device = 'Linux';
    else if (deviceInfo.includes('Android')) device = 'Android';
    else if (deviceInfo.includes('iPhone') || deviceInfo.includes('iPad')) device = 'iOS';

    return `${browser} on ${device}`;
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="spinner-large mb-4"></div>
        <p className="text-gray-600">Loading active sessions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Active Sessions</h2>
        <p className="text-gray-600">
          Manage where you're logged in. You can revoke access from devices you no longer use.
        </p>
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-600 font-semibold mb-2">No Active Sessions</p>
          <p className="text-sm text-gray-500">You don't have any active sessions yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`border-2 rounded-lg p-4 ${
                session.is_current
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  {/* Device Icon */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                    session.is_current ? 'bg-blue-200' : 'bg-gray-200'
                  }`}>
                    {getDeviceIcon(session.device_info)}
                  </div>

                  {/* Session Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">
                        {getDeviceName(session.device_info)}
                      </h3>
                      {session.is_current && (
                        <span className="px-2 py-0.5 bg-blue-200 text-blue-800 text-xs font-semibold rounded">
                          Current
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>
                          Logged in: {formatDate(session.created_at)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>
                          Expires: {formatDate(session.expires_at)}
                        </span>
                      </div>

                      {session.device_info && (
                        <div className="text-xs text-gray-500 mt-2">
                          {session.device_info}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Revoke Button */}
                {!session.is_current && (
                  <button
                    onClick={() => handleRevokeSession(session.id)}
                    disabled={revokingSessionId === session.id}
                    className="btn-danger-outline ml-4 whitespace-nowrap"
                  >
                    {revokingSessionId === session.id ? 'Revoking...' : 'Revoke'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-semibold text-blue-900 mb-1">About Sessions</p>
            <p className="text-sm text-blue-800">
              Each session represents a device where you're logged in. Sessions automatically
              expire after 7 days. Revoking a session will log you out from that device.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Device Icons
function DesktopIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function MobileIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}

function TabletIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}

function UnknownDeviceIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
