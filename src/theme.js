import { createContext, useContext } from 'react';

export const light = {
  bg: '#f3f1ec', surface: '#ffffff', text: '#152238', muted: '#6a7387', line: '#e6e2d8',
  brand: '#16345f', brandInk: '#ffffff', green: '#0b8a5b', red: '#c8323a',
  greenBg: '#e3f4ec', redBg: '#fbe7e8',
};
export const dark = {
  bg: '#0f1622', surface: '#182233', text: '#eaf0fa', muted: '#93a0b8', line: '#26334a',
  brand: '#5b8dd9', brandInk: '#0b1220', green: '#3ecf95', red: '#ff7b83',
  greenBg: '#12382b', redBg: '#3d1c21',
};

export const ThemeContext = createContext(light);
export const useTheme = () => useContext(ThemeContext);
