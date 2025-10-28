import React from 'react';

const LanguageContext = React.createContext({
  lang: 'es',
  setLang: () => {},
});

export default LanguageContext;
