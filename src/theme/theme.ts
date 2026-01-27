'use client';
import { createTheme } from '@mui/material/styles';
import { Roboto } from 'next/font/google';

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
});

const theme = createTheme({
  typography: {
    fontFamily: roboto.style.fontFamily,
  },
  palette: {
    mode: 'light', // Default to light mode, can be toggleable
    primary: {
      main: '#1976d2', // Standard Blue, can be customized
    },
    secondary: {
      main: '#9c27b0',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none', // Remove all-caps
        },
      },
    },
  },
});

export default theme;
