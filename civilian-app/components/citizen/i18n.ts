export type Lang = 'en' | 'hi' | 'mr'

export const T = {
  title: { en: 'How can we help?', hi: 'हम कैसे मदद करें?', mr: 'आम्ही कशी मदत करू?' },
  intro: {
    en: 'No login needed. Choose what you need — big buttons, plain words.',
    hi: 'लॉगिन की ज़रूरत नहीं। जो चाहिए वह चुनें।',
    mr: 'लॉगिनची गरज नाही. तुम्हाला काय हवे ते निवडा.',
  },
  needHelp: { en: 'I need help', hi: 'मुझे मदद चाहिए', mr: 'मला मदत हवी आहे' },
  needHelpHint: { en: 'Report danger or request assistance', hi: 'ख़तरे की सूचना दें या मदद माँगें', mr: 'धोका कळवा किंवा मदत मागा' },
  findShelter: { en: 'Find a shelter', hi: 'आश्रय खोजें', mr: 'निवारा शोधा' },
  findShelterHint: { en: 'Open shelters with free places', hi: 'खुले आश्रय और खाली जगह', mr: 'उघडे निवारे आणि रिकामी जागा' },
  checkAlert: { en: 'Check an alert', hi: 'चेतावनी देखें', mr: 'इशारा तपासा' },
  checkAlertHint: { en: 'Official alerts for your ward', hi: 'आपके वार्ड की चेतावनियाँ', mr: 'तुमच्या वॉर्डचे इशारे' },
  checkMessage: { en: 'Check a suspicious message', hi: 'संदिग्ध संदेश जाँचें', mr: 'संशयास्पद संदेश तपासा' },
  checkMessageHint: { en: 'Compare a forward with published advisories', hi: 'फ़ॉरवर्ड को आधिकारिक सूचना से मिलाएँ', mr: 'फॉरवर्ड अधिकृत सूचनेशी जुळवा' },
  emergency: {
    en: 'Demo Mode — not for emergency use. If life is in danger, call 112 now.',
    hi: 'डेमो मोड — आपातकाल के लिए नहीं। जान ख़तरे में हो तो 112 पर कॉल करें।',
    mr: 'डेमो मोड — आपत्कालीन वापरासाठी नाही. जीव धोक्यात असल्यास 112 वर कॉल करा.',
  },
  back: { en: 'Back', hi: 'वापस', mr: 'मागे' },
  loading: { en: 'Loading…', hi: 'लोड हो रहा है…', mr: 'लोड होत आहे…' },
  loadError: { en: 'Could not load data. Check your connection.', hi: 'डेटा लोड नहीं हुआ।', mr: 'डेटा लोड झाला नाही.' },
  next: { en: 'Next', hi: 'आगे', mr: 'पुढे' },
  submit: { en: 'Submit request', hi: 'अनुरोध भेजें', mr: 'विनंती पाठवा' },
  home: { en: 'Overview', hi: 'अवलोकन', mr: 'आढावा' },
  myRequests: { en: 'My requests', hi: 'मेरे अनुरोध', mr: 'माझ्या विनंत्या' },
  safety: { en: 'Safety guide', hi: 'सुरक्षा गाइड', mr: 'सुरक्षा मार्गदर्शक' },
  myArea: { en: 'My area', hi: 'मेरा क्षेत्र', mr: 'माझा परिसर' },
  chooseArea: { en: 'Choose your ward…', hi: 'अपना वार्ड चुनें…', mr: 'तुमचा वॉर्ड निवडा…' },
  liveAlerts: { en: 'Live alerts for your ward', hi: 'आपके वार्ड की ताज़ा चेतावनियाँ', mr: 'तुमच्या वॉर्डचे ताजे इशारे' },
  nearestShelters: { en: 'Nearest open shelters', hi: 'नज़दीकी खुले आश्रय', mr: 'जवळचे उघडे निवारे' },
  floodRisk: { en: 'Flood risk in your ward', hi: 'आपके वार्ड में बाढ़ का ख़तरा', mr: 'तुमच्या वॉर्डमधील पुराचा धोका' },
  mapTitle: { en: 'Live 3D flood map', hi: 'लाइव 3D बाढ़ नक्शा', mr: 'लाइव्ह 3D पूर नकाशा' },
  emergencyNumbers: { en: 'Emergency numbers', hi: 'आपातकालीन नंबर', mr: 'आपत्कालीन क्रमांक' },
} as const

export type TKey = keyof typeof T

export function useT(lang: Lang) {
  return (key: TKey) => T[key][lang]
}
