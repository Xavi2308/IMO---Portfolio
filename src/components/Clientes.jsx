import React, { useEffect, useState, useContext } from 'react';
import LanguageContext from '../context/LanguageContext';
import translations from '../translations';
import { supabase } from '../supabase';
import * as XLSX from 'xlsx';

function Clientes({ user }) {
  const { lang } = useContext(LanguageContext);
  const [clientes, setClientes] = useState([]);
  const [filteredClientes, setFilteredClientes] = useState([]);
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' for A-Z, 'desc' for Z-A
  const [searchTerm, setSearchTerm] = useState(''); // Search filter state

  // Utility functions for text formatting
  const cleanText = (text) => {
    if (!text) return '';
    // Remove leading/trailing spaces and reduce multiple spaces to single space
    return text.trim().replace(/\s+/g, ' ');
  };

  const formatName = (name) => {
    if (!name) return '';
    const cleaned = cleanText(name);
    return cleaned.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatPhone = (phone) => {
    if (!phone) return '';
    // Remove all non-numeric characters and spaces
    return phone.replace(/\D/g, '');
  };

  const formatAddress = (address) => {
    if (!address) return '';
    const cleaned = cleanText(address);
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
  };

  const formatNotes = (notes) => {
    if (!notes) return '';
    const cleaned = cleanText(notes);
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
  };

  // Sort function
  const sortClientes = (clientesList) => {
    const sorted = [...clientesList].sort((a, b) => {
      const nameA = formatName(a.name || '');
      const nameB = formatName(b.name || '');
      
      if (sortOrder === 'asc') {
        return nameA.localeCompare(nameB);
      } else {
        return nameB.localeCompare(nameA);
      }
    });
    return sorted;
  };

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    document_type: 'Cédula',
    document: '',
    phone: '',
    city: '',
    address: '',
    notes: '',
    'status-client': true
  });
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    const fetchClientes = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, email, document_type, document, phone, city, address, notes, created_at, "status-client"');
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      // Traer compras por cliente
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('customer_id, total_pairs, total_value');
      if (salesError) {
        setError(salesError.message);
        setLoading(false);
        return;
      }
      // Sumar compras por cliente
      const comprasPorCliente = {};
      for (const sale of sales) {
        if (!sale.customer_id) continue;
        if (!comprasPorCliente[sale.customer_id]) {
          comprasPorCliente[sale.customer_id] = { pares: 0, valor: 0 };
        }
        comprasPorCliente[sale.customer_id].pares += sale.total_pairs || 0;
        comprasPorCliente[sale.customer_id].valor += sale.total_value || 0;
      }
      // Mezclar datos
      const clientesConCompras = data.map(c => ({
        ...c,
        total_pares: comprasPorCliente[c.id]?.pares || 0,
        total_valor: comprasPorCliente[c.id]?.valor || 0,
      }));
      setClientes(clientesConCompras);
      setLoading(false);
    };
    fetchClientes();
  }, []);

  // Update filtered customers when showInactive, clientes, sortOrder, or searchTerm changes
  React.useEffect(() => {
    let filtered = clientes.filter(c => showInactive || c['status-client'] !== false);
    
    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(cliente => {
        const name = formatName(cliente.name || '').toLowerCase();
        const email = cleanText(cliente.email || '').toLowerCase();
        const document = cleanText(cliente.document || '').toLowerCase();
        const phone = formatPhone(cliente.phone || '').toLowerCase();
        const city = formatName(cliente.city || '').toLowerCase();
        const address = formatAddress(cliente.address || '').toLowerCase();
        const notes = formatNotes(cliente.notes || '').toLowerCase();
        const status = cliente['status-client'] !== false ? 'activo' : 'inactivo';
        
        return name.includes(search) || 
               email.includes(search) || 
               document.includes(search) || 
               phone.includes(search) || 
               city.includes(search) || 
               address.includes(search) || 
               notes.includes(search) ||
               status.includes(search);
      });
    }
    
    setFilteredClientes(sortClientes(filtered));
  }, [clientes, showInactive, sortOrder, searchTerm]);

  const handleToggleCustomerStatus = async (customer) => {
    try {
      const { error } = await supabase
        .from('customers')
        .update({ 'status-client': !customer['status-client'] })
        .eq('id', customer.id);
      if (error) throw error;
      
      // Update local state
      setClientes(prev => prev.map(c => 
        c.id === customer.id 
          ? { ...c, 'status-client': !c['status-client'] }
          : c
      ));
    } catch (err) {
      setError(`Error al cambiar estado del cliente: ${err.message}`);
    }
  };

  const handleFormChange = e => {
    const { name, value } = e.target;
    let processedValue = value;
    
    // Apply formatting based on field type
    if (name === 'name' || name === 'city') {
      processedValue = formatName(value);
    } else if (name === 'phone') {
      processedValue = formatPhone(value);
    } else if (name === 'address') {
      processedValue = formatAddress(value);
    } else if (name === 'notes') {
      processedValue = formatNotes(value);
    } else if (name === 'email' || name === 'document') {
      // Clean email and document fields from extra spaces
      processedValue = cleanText(value);
    }
    
    setForm(f => ({ ...f, [name]: processedValue }));
  };

  const handleEdit = cliente => {
    setEditing(cliente);
    setForm({
      name: formatName(cliente.name || ''),
      email: cleanText(cliente.email || ''),
      document_type: cliente.document_type || 'Cédula',
      document: cleanText(cliente.document || ''),
      phone: formatPhone(cliente.phone || ''),
      city: formatName(cliente.city || ''),
      address: formatAddress(cliente.address || ''),
      notes: formatNotes(cliente.notes || ''),
      'status-client': cliente['status-client'] !== false
    });
    setShowForm(true);
    setFormError(null);
  };

  const handleNew = () => {
    setEditing(null);
    setForm({ name: '', email: '', document_type: 'Cédula', document: '', phone: '', city: '', address: '', notes: '', 'status-client': true });
    setShowForm(true);
    setFormError(null);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name || !form.document) {
      setFormError('Nombre y documento son obligatorios.');
      return;
    }
    setFormError(null);
    setLoading(true);
    
    // Format data before submission
    const formattedData = {
      ...form,
      name: formatName(form.name),
      email: cleanText(form.email),
      document: cleanText(form.document),
      phone: formatPhone(form.phone),
      city: formatName(form.city),
      address: formatAddress(form.address),
      notes: formatNotes(form.notes)
    };
    
    try {
      if (editing) {
        const { error } = await supabase.from('customers').update(formattedData).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('customers').insert({ ...formattedData, created_at: new Date().toISOString() });
        if (error) throw error;
      }
      setShowForm(false);
      setEditing(null);
      setForm({ name: '', email: '', document_type: 'Cédula', document: '', phone: '', city: '', address: '', notes: '', 'status-client': true });
      // Refrescar
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, email, document_type, document, phone, city, address, notes, created_at, "status-client"');
      if (!error) {
        // Traer compras por cliente
        const { data: sales, error: salesError } = await supabase
          .from('sales')
          .select('customer_id, total_pairs, total_value');
        if (!salesError) {
          // Sumar compras por cliente
          const comprasPorCliente = {};
          for (const sale of sales) {
            if (!sale.customer_id) continue;
            if (!comprasPorCliente[sale.customer_id]) {
              comprasPorCliente[sale.customer_id] = { pares: 0, valor: 0 };
            }
            comprasPorCliente[sale.customer_id].pares += sale.total_pairs || 0;
            comprasPorCliente[sale.customer_id].valor += sale.total_value || 0;
          }
          // Mezclar datos
          const clientesConCompras = data.map(c => ({
            ...c,
            total_pares: comprasPorCliente[c.id]?.pares || 0,
            total_valor: comprasPorCliente[c.id]?.valor || 0,
          }));
          setClientes(clientesConCompras);
        } else {
          setClientes(data);
        }
      }
    } catch (err) {
      setFormError(err.message);
    }
    setLoading(false);
  };

  const handleExportCustomersToExcel = () => {
    try {
      // Verificar si hay clientes para exportar
      if (!Array.isArray(filteredClientes) || filteredClientes.length === 0) {
        setError('No hay clientes para exportar');
        return;
      }

      // Preparar datos para el Excel
      const excelData = filteredClientes.map((customer, index) => ({
        'No.': index + 1,
        'Nombre': cleanText(customer.name) || '',
        'Email': customer.email || '',
        'Tipo Documento': customer.document_type || '',
        'Documento': customer.document || '',
        'Teléfono': customer.phone || '',
        'Ciudad': cleanText(customer.city) || '',
        'Dirección': cleanText(customer.address) || '',
        'Notas': cleanText(customer.notes) || '',
        'Estado': customer['status-client'] ? 'Activo' : 'Inactivo',
        'Total Pares Comprados': customer.total_pares || 0,
        'Total Valor Compras': `$${(customer.total_valor || 0).toLocaleString('es-CO')}`,
        'Fecha Creación': customer.created_at ? new Date(customer.created_at).toLocaleDateString('es-CO') : ''
      }));

      // Crear hoja de trabajo
      const ws = XLSX.utils.json_to_sheet(excelData);
      
      // Ajustar ancho de columnas
      const colWidths = [
        { wch: 5 },   // No.
        { wch: 25 },  // Nombre
        { wch: 30 },  // Email
        { wch: 15 },  // Tipo Documento
        { wch: 15 },  // Documento
        { wch: 15 },  // Teléfono
        { wch: 20 },  // Ciudad
        { wch: 30 },  // Dirección
        { wch: 25 },  // Notas
        { wch: 10 },  // Estado
        { wch: 15 },  // Total Pares
        { wch: 18 },  // Total Valor
        { wch: 15 }   // Fecha Creación
      ];
      ws['!cols'] = colWidths;

      // Crear libro de trabajo
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Clientes');

      // Generar archivo y descargar
      const fileName = `IMO_Clientes_${new Date().toLocaleDateString('es-CO').replace(/\//g, '-')}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      setError(null); // Limpiar errores previos
    } catch (error) {
      console.error('Error exportando clientes:', error);
      setError('Error al generar el archivo Excel');
    }
  };

  return (
    <div className="p-3 max-w-full">
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-3 flex flex-wrap items-center gap-2">
          <span className="w-8 h-8 text-theme inline-block align-middle flex-shrink-0">
            {/* Better customers icon */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
              <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z" />
            </svg>
          </span>
          <span className="flex-shrink-0">{translations[lang]?.customers || 'Clientes'}</span>
          <span className="text-sm text-theme-secondary-2 font-normal flex-shrink-0">
            ({filteredClientes.length} {showInactive ? (translations[lang]?.total || 'total') : (translations[lang]?.active || 'activos')})
          </span>
        </h1>
        
        {/* Controls section */}
        <div className="flex flex-wrap gap-2 items-center mb-4">
          {user?.role !== 'vendedor' && (
            <button 
              className="btn-primary px-4 py-2 rounded-lg text-sm font-medium flex-shrink-0" 
              onClick={handleNew}
            >
              <svg className="w-4 h-4 mr-2 inline flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="whitespace-nowrap">{translations[lang]?.new_customer || 'Nuevo cliente'}</span>
            </button>
          )}
          
          <button 
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-shrink-0 ${
              showInactive 
                ? 'btn-secondary' 
                : 'bg-background-secondary text-text hover:bg-theme-hover'
            }`}
            onClick={() => setShowInactive(!showInactive)}
          >
            <span className="whitespace-nowrap">
              {showInactive ? (translations[lang]?.hide_inactive || 'Ocultar inactivos') : (translations[lang]?.show_inactive || 'Mostrar inactivos')}
            </span>
          </button>
          
          {/* Sort buttons */}
          <div className="flex border border-default rounded-lg overflow-hidden flex-shrink-0">
            <button 
              className={`px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                sortOrder === 'asc' 
                  ? 'bg-theme text-text-inverted' 
                  : 'bg-background-secondary text-text hover:bg-theme-hover'
              }`}
              onClick={() => setSortOrder('asc')}
            >
              {translations[lang]?.az || 'A-Z'}
            </button>
            <button 
              className={`px-3 py-2 text-sm font-medium transition-colors border-l border-default whitespace-nowrap ${
                sortOrder === 'desc' 
                  ? 'bg-theme text-text-inverted' 
                  : 'bg-background-secondary text-text hover:bg-theme-hover'
              }`}
              onClick={() => setSortOrder('desc')}
            >
              {translations[lang]?.za || 'Z-A'}
            </button>
          </div>

          {/* Excel Export Button */}
          <button 
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-2 flex-shrink-0"
            onClick={handleExportCustomersToExcel}
            title="Exportar todos los clientes a Excel"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="whitespace-nowrap">Exportar Excel</span>
          </button>
        </div>
        
        {/* Search filter */}
        <div className="mb-4">
          <div className="relative max-w-md">
            <input
              type="text"
            placeholder={translations[lang]?.search_customers_placeholder || 'Buscar por nombre, documento, teléfono, correo, ciudad, estado...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-default rounded-lg bg-background text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-theme focus:border-transparent"
            />
            <svg 
              className="absolute left-3 top-2.5 h-5 w-5 text-text-muted" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchTerm && (
              <div
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-2 h-6 w-6 bg-background-secondary hover:bg-theme-hover rounded cursor-pointer flex items-center justify-center transition-colors"
            title={translations[lang]?.clear_search || 'Limpiar búsqueda'}
            aria-label={translations[lang]?.clear_search || 'Limpiar búsqueda'}
              >
                <svg 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  className="h-4 w-4 text-text-muted hover:text-text transition-colors"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>
          {searchTerm && (
            <p className="text-sm text-text-muted mt-2">
              {translations[lang]?.showing_results?.replace('{count}', filteredClientes.length).replace('{term}', searchTerm) || `Mostrando ${filteredClientes.length} resultado${filteredClientes.length !== 1 ? 's' : ''} para "${searchTerm}"`}
            </p>
          )}
        </div>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme"></div>
          <span className="ml-3 text-theme-secondary-2">{translations[lang]?.loading || 'Cargando...'}</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-red-700">{translations[lang]?.error || 'Error'}: {error}</span>
          </div>
        </div>
      ) : (
        <>
          {filteredClientes.length === 0 ? (
            <div className="bg-card rounded-lg shadow-default p-8 text-center">
              <div className="text-theme-secondary-2 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-text mb-2">
                {searchTerm 
                  ? (translations[lang]?.no_customers_found || 'No se encontraron clientes')
                  : (showInactive 
                      ? (translations[lang]?.no_customers_registered || 'No hay clientes registrados')
                      : (translations[lang]?.no_active_customers || 'No hay clientes activos'))}
              </h3>
              <p className="text-theme-secondary-2 mb-4">
                {searchTerm 
                  ? (translations[lang]?.no_customers_match?.replace('{term}', searchTerm) || `No hay clientes que coincidan con "${searchTerm}". Intenta con otros términos de búsqueda.`)
                  : (showInactive 
                      ? (translations[lang]?.add_first_customer || 'Comienza agregando tu primer cliente.')
                      : (translations[lang]?.active_customers_hint || 'Los clientes activos aparecerán aquí.'))}
              </p>
              {user?.role !== 'vendedor' && (
                <button 
                  className="bg-theme text-text-inverted px-4 py-2 rounded hover:bg-theme-hover" 
                  onClick={handleNew}
                >
                  {translations[lang]?.add_customer || 'Agregar cliente'}
                </button>
              )}
            </div>
          ) : (
            <div className="bg-card rounded-lg shadow-default overflow-hidden">
              {/* Responsive table container - removed overflow-x-auto to prevent horizontal scroll */}
              <div className="w-full">
                <table className="w-full border-collapse text-sm table-fixed">
                  <thead className="bg-theme text-text-inverted">
                    <tr>
                      <th className="p-2 text-center border-r border-theme-hover w-[13%]">
                        <span className="block truncate" title={translations[lang]?.name || 'Nombre'}>{translations[lang]?.name || 'Nombre'}</span>
                      </th>
                      <th className="p-2 text-center border-r border-theme-hover w-[12%]">
                        <span className="block truncate" title={translations[lang]?.email || 'Correo'}>{translations[lang]?.email || 'Correo'}</span>
                      </th>
                      <th className="p-2 text-center border-r border-theme-hover w-[6%]">
                        <span className="block truncate" title={translations[lang]?.document_type || 'Tipo'}>{translations[lang]?.document_type || 'Tipo'}</span>
                      </th>
                      <th className="p-2 text-center border-r border-theme-hover w-[10%]">
                        <span className="block truncate" title={translations[lang]?.document || 'Documento'}>{translations[lang]?.document || 'Documento'}</span>
                      </th>
                      <th className="p-2 text-center border-r border-theme-hover w-[9%]">
                        <span className="block truncate" title={translations[lang]?.phone || 'Teléfono'}>{translations[lang]?.phone || 'Teléfono'}</span>
                      </th>
                      <th className="p-2 text-center border-r border-theme-hover w-[8%]">
                        <span className="block truncate" title={translations[lang]?.city || 'Ciudad'}>{translations[lang]?.city || 'Ciudad'}</span>
                      </th>
                      <th className="p-2 text-center border-r border-theme-hover w-[12%]">
                        <span className="block truncate" title={translations[lang]?.address || 'Dirección'}>{translations[lang]?.address || 'Dirección'}</span>
                      </th>
                      <th className="p-2 text-center border-r border-theme-hover w-[10%]">
                        <span className="block truncate" title={translations[lang]?.notes || 'Notas'}>{translations[lang]?.notes || 'Notas'}</span>
                      </th>
                      <th className="p-2 text-center border-r border-theme-hover w-[6%]">
                        <span className="block truncate" title={translations[lang]?.status || 'Estado'}>{translations[lang]?.status || 'Estado'}</span>
                      </th>
                      <th className="p-2 text-center border-r border-theme-hover w-[6%]">
                        <span className="block truncate" title={translations[lang]?.date || 'Fecha'}>{translations[lang]?.date || 'Fecha'}</span>
                      </th>
                      <th className="p-2 text-center border-r border-theme-hover w-[4%]">
                        <span className="block truncate" title={translations[lang]?.pairs || 'Pares'}>{translations[lang]?.pairs || 'Pares'}</span>
                      </th>
                      <th className="p-2 text-center border-r border-theme-hover w-[8%]">
                        <span className="block truncate" title={translations[lang]?.total || 'Total'}>{translations[lang]?.total || 'Total'}</span>
                      </th>
                      <th className="p-2 text-center w-[10%]">
                        <span className="block truncate" title={translations[lang]?.actions || 'Acciones'}>{translations[lang]?.actions || 'Acciones'}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClientes.map(cliente => (
                      <tr key={cliente.id} className="border-t border-default hover-bg">
                        <td className="p-2 border-r border-default font-medium text-center">
                          <div className="truncate" title={formatName(cliente.name)}>
                            {formatName(cliente.name)}
                          </div>
                        </td>
                        <td className="p-2 border-r border-default text-center">
                          <div className="truncate" title={cleanText(cliente.email) || 'N/A'}>
                            <span className="text-xs px-1 py-0.5 rounded bg-background-secondary text-text">
                              {cleanText(cliente.email) || 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="p-2 border-r border-default text-center">
                          <span className="text-xs bg-theme-secondary-2 px-1 py-0.5 rounded">
                            {translations[lang]?.[cliente.document_type?.toLowerCase()] || cliente.document_type || 'N/A'}
                          </span>
                        </td>
                        <td className="p-2 border-r border-default font-mono text-center">
                          <div className="truncate" title={cleanText(cliente.document) || 'N/A'}>
                            {cleanText(cliente.document) || 'N/A'}
                          </div>
                        </td>
                        <td className="p-2 border-r border-default font-mono text-center">
                          <div className="truncate" title={formatPhone(cliente.phone) || 'N/A'}>
                            {formatPhone(cliente.phone) || 'N/A'}
                          </div>
                        </td>
                        <td className="p-2 border-r border-default text-center">
                          <div className="truncate" title={formatName(cliente.city) || 'N/A'}>
                            {formatName(cliente.city) || 'N/A'}
                          </div>
                        </td>
                        <td className="p-2 border-r border-default text-center">
                          <div className="truncate" title={formatAddress(cliente.address) || 'N/A'}>
                            {formatAddress(cliente.address) || 'N/A'}
                          </div>
                        </td>
                        <td className="p-2 border-r border-default text-center">
                          <div className="truncate" title={formatNotes(cliente.notes) || 'N/A'}>
                            {formatNotes(cliente.notes) || 'N/A'}
                          </div>
                        </td>
                        <td className="p-2 border-r border-default text-center">
                          <span className={`px-1 py-0.5 rounded-full text-xs font-medium ${
                            cliente['status-client'] !== false 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {cliente['status-client'] !== false ? (translations[lang]?.active || 'Activo') : (translations[lang]?.inactive || 'Inactivo')}
                          </span>
                        </td>
                        <td className="p-2 border-r border-default text-xs text-theme-secondary-2 text-center">
                          {cliente.created_at ? new Date(cliente.created_at).toLocaleDateString(lang === 'es' ? 'es-ES' : lang === 'en' ? 'en-US' : lang) : 'N/A'}
                        </td>
                        <td className="p-2 border-r border-default text-center font-medium">
                          {cliente.total_pares || 0}
                        </td>
                        <td className="p-2 border-r border-default text-center font-medium">
                          <div className="truncate" title={`$${(cliente.total_valor || 0).toLocaleString(lang === 'es' ? 'es-CO' : lang === 'en' ? 'en-US' : lang)}`}>
                            ${(cliente.total_valor || 0).toLocaleString(lang === 'es' ? 'es-CO' : lang === 'en' ? 'en-US' : lang)}
                          </div>
                        </td>
                        <td className="p-2 border-r border-default text-center">
                          <div className="flex gap-1 justify-center">
                            {user?.role !== 'vendedor' && (
                              <>
                                <button 
                                  className="btn-secondary px-2 py-1 rounded text-xs hover:bg-theme-hover flex-shrink-0" 
                                  onClick={() => handleEdit(cliente)}
                                  title={translations[lang]?.edit_customer || 'Editar cliente'}
                                >
                                  <span className="block w-4 h-4 flex items-center justify-center">✏️</span>
                                </button>
                                <button 
                                  onClick={() => handleToggleCustomerStatus(cliente)} 
                                  className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${
                                    cliente['status-client'] !== false 
                                      ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                                  }`}
                                  title={cliente['status-client'] !== false ? (translations[lang]?.deactivate_customer || 'Desactivar cliente') : (translations[lang]?.activate_customer || 'Activar cliente')}
                                >
                                  <span className="block w-4 h-4 flex items-center justify-center">
                                    {cliente['status-client'] !== false ? '🔒' : '🔓'}
                                  </span>
                                </button>
                              </>
                            )}
                            {user?.role === 'vendedor' && (
                              <span className="text-text-muted text-xs px-2 py-1">Solo lectura</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <form className="bg-card p-4 sm:p-6 rounded-lg shadow-default w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" onSubmit={handleSubmit}>
            <h3 className="text-xl font-bold mb-4 text-theme flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={editing ? "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" : "M12 6v6m0 0v6m0-6h6m-6 0H6"} />
              </svg>
              {editing ? (translations[lang]?.edit_customer || 'Editar Cliente') : (translations[lang]?.new_customer || 'Nuevo Cliente')}
            </h3>
            {formError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-red-700 text-sm">{formError}</span>
                </div>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-sm font-medium text-text">{translations[lang]?.name || 'Nombre'} *</label>
                <input 
                  type="text" 
                  name="name" 
                  value={form.name} 
                  onChange={handleFormChange} 
                  className="input w-full" 
                  placeholder="Ej: Juan Pérez"
                  required
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-text">{translations[lang]?.email || 'Correo'}</label>
                <input 
                  type="email" 
                  name="email" 
                  value={form.email} 
                  onChange={handleFormChange} 
                  className="input w-full" 
                  placeholder="correo@ejemplo.com"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-2 text-sm font-medium text-text">{translations[lang]?.document_type || 'Tipo Documento'}</label>
                  <select 
                    name="document_type" 
                    value={form.document_type} 
                    onChange={handleFormChange} 
                    className="input w-full"
                  >
                  <option value="Cédula">{translations[lang]?.cedula || 'Cédula'}</option>
                  <option value="NIT">{translations[lang]?.nit || 'NIT'}</option>
                  <option value="Pasaporte">{translations[lang]?.pasaporte || 'Pasaporte'}</option>
                  <option value="Otros">{translations[lang]?.otros || 'Otros'}</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-text">{translations[lang]?.document || 'Documento'} *</label>
                  <input 
                    type="text" 
                    name="document" 
                    value={form.document} 
                    onChange={handleFormChange} 
                    className="input w-full" 
                    placeholder="12345678"
                    required
                    disabled={editing && editing.document && editing.document.trim() !== ''}
                    title={editing && editing.document && editing.document.trim() !== '' ? 'El documento no se puede editar por seguridad' : ''}
                  />
                  {editing && editing.document && editing.document.trim() !== '' && (
                    <p className="text-xs text-orange-600 mt-1">⚠️ Campo protegido - No editable por seguridad</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-text">{translations[lang]?.phone || 'Teléfono'}</label>
                <input 
                  type="text" 
                  name="phone" 
                  value={form.phone} 
                  onChange={handleFormChange} 
                  className="input w-full font-mono" 
                  placeholder="3001234567"
                  disabled={editing && editing.phone && editing.phone.trim() !== ''}
                  title={editing && editing.phone && editing.phone.trim() !== '' ? 'El teléfono no se puede editar por seguridad' : ''}
                />
                <p className="text-xs text-theme-secondary-2 mt-1">Solo números, sin espacios ni guiones</p>
                {editing && editing.phone && editing.phone.trim() !== '' && (
                  <p className="text-xs text-orange-600 mt-1">⚠️ Campo protegido - No editable por seguridad</p>
                )}
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-text">{translations[lang]?.city || 'Ciudad'}</label>
                <input 
                  type="text" 
                  name="city" 
                  value={form.city} 
                  onChange={handleFormChange} 
                  className="input w-full" 
                  placeholder="Ej: Bogotá"
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-text">{translations[lang]?.address || 'Dirección'}</label>
                <input 
                  type="text" 
                  name="address" 
                  value={form.address} 
                  onChange={handleFormChange} 
                  className="input w-full" 
                  placeholder="Ej: Calle 123 #45-67"
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-text">{translations[lang]?.notes || 'Notas'}</label>
                <textarea 
                  name="notes" 
                  value={form.notes} 
                  onChange={handleFormChange} 
                  className="input w-full resize-none" 
                  rows="3" 
                  placeholder="Información adicional del cliente..."
                />
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  name="status-client" 
                  checked={form['status-client']} 
                  onChange={(e) => setForm({...form, 'status-client': e.target.checked})}
                  className="w-4 h-4 text-theme border-gray-300 rounded focus:ring-theme focus:ring-2"
                />
                <label className="text-sm font-medium text-text">{translations[lang]?.active_customer || 'Cliente activo'}</label>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-6 pt-4 border-t border-default">
              <button 
                type="button" 
                onClick={() => { setShowForm(false); setEditing(null); }} 
                className="btn-secondary px-4 py-2 rounded-lg"
              >
                {translations[lang]?.cancel || 'Cancelar'}
              </button>
              <button 
                type="submit" 
                className="btn-primary px-4 py-2 rounded-lg"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  {translations[lang]?.saving || 'Guardando...'}
                  </span>
                ) : (
                  translations[lang]?.save || 'Guardar'
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default Clientes;
