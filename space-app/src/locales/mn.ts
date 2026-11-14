import type { PartialTranslation } from './eng'

export default {
  navigation: { label: 'Харагдац', map: 'Газрын зураг', calendar: 'Хуанли' },
  search: {
    label: 'Газар хайх',
    button: 'Хайх',
    noResults: 'Газар олдсонгүй.',
    error: 'Хайлт амжилтгүй боллоо. Дахин оролдоно уу.',
  },
  map: {
    title: 'Газрын зураг',
    zoomIn: 'Томруулах',
    zoomOut: 'Жижигрүүлэх',
    attribution: 'Эх сурвалжийг харуулах эсвэл нуух',
    feedback: 'Газрын зургийн талаарх санал',
  },
  draw: {
    draw: 'Бүс зурах',
    cancel: 'Зурахыг цуцлах',
    remove: 'Сонголтыг арилгах',
    zoomHint: 'Бүс сонгохын тулд томруулна уу',
    zoomHintTitle: 'Бүс сонгохын тулд томруулна уу ({{zoom}}+)',
    closeShape: 'Бүс сонгохын тулд дүрсийг хаана уу',
    selectedArea: 'Сонгосон бүс: {{area}}',
  },
  language: {
    label: 'Хэл',
    placeholder: 'Хэл эсвэл код',
    noResults: 'Хэл олдсонгүй.',
  },
  calendar: { label: 'Хуанлийн харагдац' },
  notFound: {
    heading: 'Хуудас олдсонгүй',
    backToMap: 'Газрын зураг руу буцах',
  },
  pageTitles: {
    map: 'Газрын зураг',
    calendar: 'Хуанли',
    notFound: 'Хуудас олдсонгүй',
  },
} satisfies PartialTranslation
