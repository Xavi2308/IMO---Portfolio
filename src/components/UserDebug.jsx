/**
 * @file UserDebug.jsx
 * @description Componente temporal para debuggear datos de usuario y empresa
 */

import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const UserDebug = () => {
  const { user, company, loading } = useAuth();

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'white',
      border: '2px solid red',
      padding: '10px',
      borderRadius: '8px',
      zIndex: 9999,
      maxWidth: '300px',
      fontSize: '12px'
    }}>
      <h4 style={{ margin: '0 0 10px 0', color: 'red' }}>🐛 USER DEBUG</h4>
      
      <div><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</div>
      
      <div style={{ marginTop: '10px' }}>
        <strong>User Data:</strong>
        <pre style={{ fontSize: '10px', margin: '5px 0' }}>
          {user ? JSON.stringify({
            id: user.id,
            email: user.email,
            company_id: user.company_id,
            role: user.role
          }, null, 2) : 'null'}
        </pre>
      </div>

      <div style={{ marginTop: '10px' }}>
        <strong>Company Data:</strong>
        <pre style={{ fontSize: '10px', margin: '5px 0' }}>
          {company ? JSON.stringify({
            id: company.id,
            name: company.name,
            code: company.code
          }, null, 2) : 'null'}
        </pre>
      </div>

      <div style={{ marginTop: '10px' }}>
        <strong>LocalStorage User:</strong>
        <pre style={{ fontSize: '10px', margin: '5px 0' }}>
          {localStorage.getItem('user') ? 
            JSON.stringify(JSON.parse(localStorage.getItem('user')), null, 2).substring(0, 200) + '...' : 
            'null'
          }
        </pre>
      </div>
    </div>
  );
};

export default UserDebug;