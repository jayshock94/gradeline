// The design-system runtime is a classic script that expects React on window; give it that before it loads.
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
window.React = React;
window.ReactDOM = ReactDOM;
