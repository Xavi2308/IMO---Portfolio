// DOCUMENT filename="Customers.jsx"
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

function Customers({ setError, errorMessage, user, readOnly = false }) {
  const [customers, setCustomers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    document: '',
    phone: '',
    city: '',
    address: '',
    notes: '',
  });

  // Determinar si el usuario puede editar
  const canEdit = !readOnly && ['admin', 'produccion'].includes(user?.role);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase.from('customers').select(`
        *,
        sales (
          id,
          created_at,
          status
        )
      `);
      if (error) throw error;
      setCustomers(data);
    } catch (err) {
      setError(`Error al obtener clientes: ${err.message}`);
    }
  };

  const handleSaveCustomer = async () => {
    try {
      if (editingCustomer) {
        await supabase
          .from('customers')
          .update(newCustomer)
          .eq('id', editingCustomer.id);
      } else {
        await supabase.from('customers').insert(newCustomer);
      }
      setShowForm(false);
      setEditingCustomer(null);
      setNewCustomer({ name: '', document: '', phone: '', city: '', address: '', notes: '' });
      fetchCustomers();
    } catch (err) {
      setError(`Error al guardar cliente: ${err.message}`);
    }
  };

  const handleDeleteCustomer = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este cliente?')) return;
    try {
      await supabase.from('customers').delete().eq('id', id);
      fetchCustomers();
    } catch (err) {
      setError(`Error al eliminar cliente: ${err.message}`);
    }
  };

  return (
    <div className="bg-background p-6">
      <h2 className="text-2xl font-bold text-theme mb-4 flex items-center">
        <span className="mr-2">👥</span> Gestión de Clientes
      </h2>
      {errorMessage && <p className="text-secondary-4 mb-4">{errorMessage}</p>}
      
      {/* Solo mostrar el botón si puede editar */}
      {canEdit && (
        <button
          onClick={() => {
            setEditingCustomer(null);
            setNewCustomer({ name: '', document: '', phone: '', city: '', address: '', notes: '' });
            setShowForm(true);
          }}
          className="bg-theme text-text-inverted px-4 py-2 rounded hover:bg-theme-hover mb-4 transition-colors"
        >
          + Nuevo Cliente
        </button>
      )}
      
      {readOnly && (
        <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
          <p className="text-yellow-800 text-sm">
            <strong>Modo solo lectura:</strong> Puedes ver los clientes pero no editarlos.
          </p>
        </div>
      )}

      <div className="max-h-[70vh] overflow-y-auto">
        <table className="w-full border-collapse bg-card rounded-lg shadow-md">
          <thead className="sticky top-0 bg-secondary-1 text-text-inverted z-20">
            <tr>
              <th className="border border-secondary-2 p-2 text-center">Nombre</th>
              <th className="border border-secondary-2 p-2 text-center">CC o NIT</th>
              <th className="border border-secondary-2 p-2 text-center">Teléfono</th>
              <th className="border border-secondary-2 p-2 text-center">Ciudad</th>
              <th className="border border-secondary-2 p-2 text-center">Dirección</th>
              <th className="border border-secondary-2 p-2 text-center">Última Venta</th>
              <th className="border border-secondary-2 p-2 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
          {customers.map((customer) => {
            const lastSale = customer.sales
              .filter(sale => sale.status === 'confirmed')
              .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
            return (
              <tr key={customer.id} className="border-t border-secondary-2">
                <td className="border border-secondary-2 p-2 text-center">{customer.name}</td>
                <td className="border border-secondary-2 p-2 text-center">{customer.document}</td>
                <td className="border border-secondary-2 p-2 text-center">{customer.phone || 'N/A'}</td>
                <td className="border border-secondary-2 p-2 text-center">{customer.city || 'N/A'}</td>
                <td className="border border-secondary-2 p-2 text-center">{customer.address || 'N/A'}</td>
                <td className="border border-secondary-2 p-2 text-center">
                  {lastSale ? new Date(lastSale.created_at).toLocaleDateString() : 'N/A'}
                </td>
                <td className="border border-secondary-2 p-2 text-center">
                  {canEdit ? (
                    <>
                      <button
                        onClick={() => {
                          setEditingCustomer(customer);
                          setNewCustomer({
                            name: customer.name,
                            document: customer.document,
                            phone: customer.phone,
                            city: customer.city,
                            address: customer.address,
                            notes: customer.notes,
                          });
                          setShowForm(true);
                        }}
                        className="bg-secondary-2 text-text-inverted px-2 py-1 rounded mr-2 hover:bg-theme transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteCustomer(customer.id)}
                        className="bg-secondary-4 text-text-inverted px-2 py-1 rounded hover:bg-theme-hover transition-colors"
                      >
                        Eliminar
                      </button>
                    </>
                  ) : (
                    <span className="text-text-muted italic">Solo lectura</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-card p-4 sm:p-6 rounded-lg shadow-lg w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto border border-secondary-2">
            <h2 className="text-xl font-bold mb-4 text-theme">
              {editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-text mb-1 font-medium">Nombre completo *</label>
                <input
                  type="text"
                  placeholder="Nombre completo"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  className="w-full p-2 border border-secondary-2 rounded bg-background text-text"
                />
              </div>
              <div>
                <label className="block text-text mb-1 font-medium">CC o NIT *</label>
                <input
                  type="text"
                  placeholder="CC o NIT"
                  value={newCustomer.document}
                  onChange={(e) => setNewCustomer({ ...newCustomer, document: e.target.value })}
                  className="w-full p-2 border border-secondary-2 rounded bg-background text-text"
                />
              </div>
              <div>
                <label className="block text-text mb-1 font-medium">Teléfono</label>
                <input
                  type="text"
                  placeholder="Teléfono"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  className="w-full p-2 border border-secondary-2 rounded bg-background text-text"
                />
              </div>
              <div>
                <label className="block text-text mb-1 font-medium">Ciudad</label>
                <input
                  type="text"
                  placeholder="Ciudad"
                  value={newCustomer.city}
                  onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                  className="w-full p-2 border border-secondary-2 rounded bg-background text-text"
                />
              </div>
              <div>
                <label className="block text-text mb-1 font-medium">Dirección</label>
                <input
                  type="text"
                  placeholder="Dirección"
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  className="w-full p-2 border border-secondary-2 rounded bg-background text-text"
                />
              </div>
              <div>
                <label className="block text-text mb-1 font-medium">Observaciones</label>
                <textarea
                  placeholder="Observaciones"
                  value={newCustomer.notes}
                  onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                  className="w-full p-2 border border-secondary-2 rounded bg-background text-text resize-none"
                  rows="3"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="bg-secondary-3 text-text px-4 py-2 rounded border border-secondary-2 hover:bg-secondary-1 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveCustomer}
                className="bg-theme text-text-inverted px-4 py-2 rounded hover:bg-theme-hover transition-colors"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Customers;
