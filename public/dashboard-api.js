const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:4000' 
  : 'https://api.construction.seemoneyproductions.com';

function getCognitoToken() {
  return localStorage.getItem('id_token') || sessionStorage.getItem('id_token');
}

async function loadAuthenticatedDashboard() {
  const token = getCognitoToken();

  if (!token) {
    console.warn('No active session token found. Redirecting to login...');
    window.location.href = '/login.html';
    return;
  }

  try {
    const response = await fetch(\\/api/customer/dashboard\, {
      method: 'GET',
      headers: {
        'Authorization': \Bearer \\,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 401 || response.status === 403) {
      console.error('Session expired or unauthorized token.');
      return;
    }

    const data = await response.json();
    console.log('Authenticated customer data loaded successfully:', data);
    
    // Wire payload directly to dashboard UI
    if (window.renderCustomerUI) {
      window.renderCustomerUI(data);
    }
  } catch (error) {
    console.error('Failed to fetch customer dashboard:', error);
  }
}

document.addEventListener('DOMContentLoaded', loadAuthenticatedDashboard);
