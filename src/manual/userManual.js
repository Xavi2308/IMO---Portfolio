// Manual de usuario detallado para IMO
export default {
  es: {
    'agregar usuario': {
      title: '¿Cómo puedo agregar un nuevo usuario?',
      steps: [
        '1. Ve al menú lateral y haz clic en "Gestión de Usuarios".',
        '2. Haz clic en el botón "Agregar Usuario".',
        '3. Completa los campos requeridos: nombre, correo, rol, etc.',
        '4. Asigna los permisos necesarios según el rol.',
        '5. Haz clic en "Guardar" para crear el usuario.',
        '6. El nuevo usuario recibirá un correo para activar su cuenta (si está configurado).'
      ],
      notes: 'Solo los administradores pueden agregar nuevos usuarios. Si no ves la opción, revisa tus permisos.'
    },
    'eliminar usuario': {
      title: '¿Cómo eliminar un usuario?',
      steps: [
        '1. Ve a "Gestión de Usuarios".',
        '2. Busca el usuario que deseas eliminar.',
        '3. Haz clic en el icono de eliminar (🗑️) junto al usuario.',
        '4. Confirma la eliminación en el cuadro de diálogo.'
      ],
      notes: 'No puedes eliminar tu propio usuario ni el del superadministrador.'
    },
    'agregar producto': {
      title: '¿Cómo agregar un nuevo producto al inventario?',
      steps: [
        '1. Ve a la sección "Producción/Ges. de inventarios".',
        '2. Haz clic en "Agregar Producto".',
        '3. Completa los datos del producto: referencia, nombre, talla, color, línea, etc.',
        '4. Sube una imagen si lo deseas.',
        '5. Haz clic en "Guardar".'
      ],
      notes: 'Puedes editar o eliminar productos desde la misma sección.'
    },
    'realizar inventario': {
      title: '¿Cómo realizar un inventario físico?',
      steps: [
        '1. Ve a la sección "Inventariado" que se encuentra en "Producción/Ges. de inventarios".',
        '2. Selecciona el almacén o subinventario.',
        '3. Escanea los productos o ingrésalos manualmente.',
        '4. Revisa los cambios y haz clic en "Confirmar" para aplicar.'
      ],
      notes: 'El inventario físico actualizará las existencias reales en el sistema.'
    },
    'cambiar idioma': {
      title: '¿Cómo cambiar el idioma de la aplicación?',
      steps: [
        '1. Ve a "Configuración".',
        '2. Selecciona el idioma deseado en la sección de idioma.',
        '3. El idioma se aplicará a toda la aplicación y se guardará para futuras sesiones.'
      ],
      notes: 'El idioma se sincroniza con tu perfil y se guarda en la base de datos.'
    },
    // ...más temas y preguntas frecuentes...
  },
  en: {
    'add user': {
      title: 'How do I add a new user?',
      steps: [
        '1. Go to the sidebar and click on "User Management".',
        '2. Click the "Add User" button.',
        '3. Fill in the required fields: name, email, role, etc.',
        '4. Assign the necessary permissions according to the role.',
        '5. Click "Save" to create the user.',
        '6. The new user will receive an email to activate their account (if configured).'
      ],
      notes: 'Only administrators can add new users. If you do not see the option, check your permissions.'
    },
    'delete user': {
      title: 'How do I delete a user?',
      steps: [
        '1. Go to "User Management".',
        '2. Find the user you want to delete.',
        '3. Click the delete icon (🗑️) next to the user.',
        '4. Confirm the deletion in the dialog box.'
      ],
      notes: 'You cannot delete your own user or the superadmin.'
    },
    'add product': {
      title: 'How do I add a new product to inventory?',
      steps: [
        '1. Go to the "Inventory" section.',
        '2. Click on "Add Product".',
        '3. Fill in the product details: reference, name, size, color, line, etc.',
        '4. Upload an image if desired.',
        '5. Click "Save".'
      ],
      notes: 'You can edit or delete products from the same section.'
    },
    'stocktaking': {
      title: 'How do I perform a physical inventory?',
      steps: [
        '1. Go to the "Stocktaking" section.',
        '2. Select the warehouse or sub-inventory.',
        '3. Scan the products or enter them manually.',
        '4. Review the changes and click "Confirm" to apply.'
      ],
      notes: 'Physical inventory will update the real stock in the system.'
    },
    'change language': {
      title: 'How do I change the application language?',
      steps: [
        '1. Go to "Settings".',
        '2. Select the desired language in the language section.',
        '3. The language will be applied to the entire application and saved for future sessions.'
      ],
      notes: 'The language is synced with your profile and saved in the database.'
    },
    // ...more topics and FAQs...
  }
};
