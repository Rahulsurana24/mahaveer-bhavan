import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Check, Globe } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface LanguageSelectionDialogProps {
  open: boolean;
  onClose: () => void;
}

export const LanguageSelectionDialog = ({ open, onClose }: LanguageSelectionDialogProps) => {
  const { language, setLanguage, t } = useLanguage();
  const [selectedLang, setSelectedLang] = useState(language);

  const languages = [
    {
      code: 'en' as const,
      name: 'English',
      nativeName: 'English',
      flag: '🇬🇧'
    },
    {
      code: 'hi' as const,
      name: 'Hindi',
      nativeName: 'हिंदी',
      flag: '🇮🇳'
    }
  ];

  const handleContinue = () => {
    setLanguage(selectedLang);
    localStorage.setItem('language_selected', 'true');
    onClose();
  };

  const handleSkip = () => {
    localStorage.setItem('language_selected', 'true');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-zinc-900 to-black border-white/10">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-lg shadow-orange-500/30">
              <Globe className="w-8 h-8 text-white" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl text-white">
            {language === 'hi' ? 'अपनी भाषा चुनें' : 'Select Your Language'}
          </DialogTitle>
          <DialogDescription className="text-center text-white/60">
            {language === 'hi'
              ? 'एप्लिकेशन के लिए अपनी पसंदीदा भाषा चुनें'
              : 'Choose your preferred language for the application'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {languages.map((lang) => (
            <Card
              key={lang.code}
              className={`cursor-pointer transition-all duration-200 border-2 ${
                selectedLang === lang.code
                  ? 'bg-gradient-to-r from-orange-500/20 to-red-600/20 border-orange-500'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
              }`}
              onClick={() => setSelectedLang(lang.code)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{lang.flag}</span>
                    <div>
                      <p className="font-semibold text-white text-lg">{lang.nativeName}</p>
                      <p className="text-sm text-white/60">{lang.name}</p>
                    </div>
                  </div>
                  {selectedLang === lang.code && (
                    <div className="p-1.5 bg-orange-500 rounded-full">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <Button
            onClick={handleContinue}
            className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold py-6 rounded-xl shadow-lg shadow-orange-500/30"
          >
            {language === 'hi' ? 'जारी रखें' : 'Continue'}
          </Button>
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="w-full text-white/60 hover:text-white hover:bg-white/5"
          >
            {language === 'hi' ? 'अभी छोड़ें' : 'Skip for now'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
