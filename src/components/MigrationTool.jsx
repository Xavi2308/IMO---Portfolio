import React, { useState } from 'react';

const MigrationTool = () => {
  const [result, setResult] = useState(null);
  const [profilesResult, setProfilesResult] = useState(null);
  const [rlsResult, setRlsResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [rlsLoading, setRlsLoading] = useState(false);

  const runMigration = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('http://localhost:5000/api/migrate-company-ids', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const runProfilesMigration = async () => {
    setProfilesLoading(true);
    setProfilesResult(null);
    
    try {
      const response = await fetch('http://localhost:5000/api/migrate-profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      setProfilesResult(data);
    } catch (error) {
      setProfilesResult({ success: false, error: error.message });
    } finally {
      setProfilesLoading(false);
    }
  };

  const runRlsFix = async () => {
    setRlsLoading(true);
    setRlsResult(null);
    
    try {
      const response = await fetch('http://localhost:5000/api/fix-rls-recursion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      setRlsResult(data);
    } catch (error) {
      setRlsResult({ success: false, error: error.message });
    } finally {
      setRlsLoading(false);
    }
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: '50px', 
      left: '50px', 
      background: 'white', 
      border: '2px solid blue', 
      padding: '20px', 
      borderRadius: '8px',
      zIndex: 10000,
      maxWidth: '700px',
      maxHeight: '600px',
      overflow: 'auto'
    }}>
      <h3>🛠️ Herramienta de Migración</h3>
      
      {/* Botón para migrar productos y variaciones */}
      <div style={{ marginBottom: '15px' }}>
        <button 
          onClick={runMigration} 
          disabled={loading}
          style={{
            background: loading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          {loading ? 'Ejecutando...' : 'Migrar Productos y Variaciones'}
        </button>
      </div>

      {/* Botón para migrar usuarios */}
      <div style={{ marginBottom: '15px' }}>
        <button 
          onClick={runProfilesMigration} 
          disabled={profilesLoading}
          style={{
            background: profilesLoading ? '#ccc' : '#6f42c1',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: profilesLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {profilesLoading ? 'Ejecutando...' : 'Migrar Usuarios (Profiles)'}
        </button>
      </div>

      {/* Botón para arreglar RLS recursion */}
      <div style={{ marginBottom: '15px' }}>
        <button 
          onClick={runRlsFix} 
          disabled={rlsLoading}
          style={{
            background: rlsLoading ? '#ccc' : '#dc3545',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: rlsLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {rlsLoading ? 'Ejecutando...' : 'Arreglar RLS Recursion'}
        </button>
      </div>

      {/* Resultado de migración de productos */}
      {result && (
        <div style={{ marginTop: '20px', fontSize: '12px', borderBottom: '1px solid #ccc', paddingBottom: '15px' }}>
          {result.success ? (
            <div style={{ color: 'green' }}>
              <h4>✅ Migración de Productos Exitosa</h4>
              <div><strong>Empresas encontradas:</strong> {result.companiesFound}</div>
              <div><strong>Empresa objetivo:</strong> {result.targetCompany}</div>
              
              <h5>Antes de la migración:</h5>
              <div>products: {result.before.products} registros sin company_id</div>
              <div>variations: {result.before.variations} registros sin company_id</div>
              
              <h5>Después de la migración:</h5>
              <div>products: {result.after.products} registros sin company_id</div>
              <div>variations: {result.after.variations} registros sin company_id</div>
              
              <h5>Distribución por empresa:</h5>
              <pre style={{ background: '#f5f5f5', padding: '10px', fontSize: '10px' }}>
                {JSON.stringify(result.distribution, null, 2)}
              </pre>
            </div>
          ) : (
            <div style={{ color: 'red' }}>
              <h4>❌ Error en Migración de Productos</h4>
              <p>{result.error}</p>
            </div>
          )}
        </div>
      )}

      {/* Resultado de migración de usuarios */}
      {profilesResult && (
        <div style={{ marginTop: '20px', fontSize: '12px' }}>
          {profilesResult.success ? (
            <div style={{ color: 'green' }}>
              <h4>✅ Migración de Usuarios Exitosa</h4>
              <div><strong>Empresa objetivo:</strong> {profilesResult.targetCompany}</div>
              
              <h5>Antes de la migración:</h5>
              <div>profiles: {profilesResult.before.profiles} usuarios sin company_id</div>
              
              <h5>Después de la migración:</h5>
              <div>profiles: {profilesResult.after.profiles} usuarios sin company_id</div>
              
              {profilesResult.before.usersMigrated && profilesResult.before.usersMigrated.length > 0 && (
                <div>
                  <h5>Usuarios migrados:</h5>
                  <ul style={{ fontSize: '11px' }}>
                    {profilesResult.before.usersMigrated.map((user, i) => (
                      <li key={i}>{user.username} ({user.email})</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <h5>Distribución final:</h5>
              <pre style={{ background: '#f5f5f5', padding: '10px', fontSize: '10px' }}>
                {JSON.stringify(profilesResult.distribution, null, 2)}
              </pre>
            </div>
          ) : (
            <div style={{ color: 'red' }}>
              <h4>❌ Error en Migración de Usuarios</h4>
              <p>{profilesResult.error}</p>
            </div>
          )}
        </div>
      )}
      {/* Resultado de arreglo RLS */}
      {rlsResult && (
        <div style={{ marginTop: '20px', fontSize: '12px', borderBottom: '1px solid #ccc', paddingBottom: '15px' }}>
          {rlsResult.success ? (
            <div style={{ color: 'green' }}>
              <h4>✅ RLS Funciona Correctamente</h4>
              <div><strong>Datos encontrados:</strong> {rlsResult.data?.length || 0} registros</div>
            </div>
          ) : (
            <div style={{ color: 'red' }}>
              <h4>❌ {rlsResult.diagnosis || 'Error en RLS'}</h4>
              <p><strong>Error:</strong> {rlsResult.error}</p>
              
              {rlsResult.manualFix && (
                <div style={{ marginTop: '15px' }}>
                  <h5>🛠️ Solución Manual:</h5>
                  <ol style={{ fontSize: '11px', paddingLeft: '20px' }}>
                    {rlsResult.instructions?.map((instruction, i) => (
                      <li key={i} style={{ marginBottom: '5px' }}>{instruction}</li>
                    ))}
                  </ol>
                  
                  <div style={{ marginTop: '10px' }}>
                    <strong>SQL a ejecutar:</strong>
                    <textarea 
                      readOnly 
                      value={rlsResult.manualFix}
                      style={{ 
                        width: '100%', 
                        height: '200px', 
                        fontSize: '10px', 
                        fontFamily: 'monospace',
                        marginTop: '5px',
                        padding: '5px',
                        border: '1px solid #ccc'
                      }}
                    />
                    <button 
                      onClick={() => navigator.clipboard.writeText(rlsResult.manualFix)}
                      style={{
                        marginTop: '5px',
                        padding: '5px 10px',
                        background: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        fontSize: '10px',
                        cursor: 'pointer'
                      }}
                    >
                      📋 Copiar SQL
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MigrationTool;