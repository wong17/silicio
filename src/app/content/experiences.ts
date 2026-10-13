import type { Section } from '../world/scene-inputs';
export const EXPERIENCES = [
  {
    id: '8086' as Section,
    number: '01',
    title: 'Banco 8086',
    subtitle: 'La máquina desnuda',
    summary: 'Haz que una instrucción atraviese registros, memoria y unidad aritmética.',
    accent: '#cf9c65',
  },
  {
    id: 'memory' as Section,
    number: '02',
    title: 'Memoria',
    subtitle: 'Geografía de los datos',
    summary: 'Dos números forman una dirección. Explora dónde terminan realmente tus bytes.',
    accent: '#99ae9d',
  },
  {
    id: 'time' as Section,
    number: '03',
    title: 'Cronoscopio',
    subtitle: 'El pasado es editable',
    summary: 'Detén una ejecución, vuelve a su origen y cambia una decisión.',
    accent: '#aca3ba',
  },
  {
    id: 'apple' as Section,
    number: '04',
    title: 'Apple Silicon',
    subtitle: 'Un territorio compartido',
    summary: 'Abre un sistema en un chip y sigue un buffer entre CPU y GPU.',
    accent: '#a0b4bf',
  },
  {
    id: 'machine' as Section,
    number: '05',
    title: 'La máquina',
    subtitle: 'Tres conversaciones',
    summary: 'Direcciones, datos y control: encuentra el propósito de cada conexión.',
    accent: '#c7ac6b',
  },
];
