import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MobileIcon } from './MobileIcon';

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  buttonContainer: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingTop: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    marginHorizontal: 16,
    color: '#1f2937',
  },
  languageOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  languageOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  activeLanguageOption: {
    backgroundColor: '#f0fdf4',
  },
  activeLanguageOptionText: {
    color: '#0a7d6c',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 16,
    color: '#0a7d6c',
    fontWeight: '600',
  },
});

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'de', name: 'Deutsch' },
  ];

  const handleLanguageChange = async (langCode: string) => {
    await i18n.changeLanguage(langCode);
    await AsyncStorage.setItem('language', langCode);
    setIsModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.buttonContainer}
        onPress={() => setIsModalVisible(true)}
      >
        <View style={styles.buttonContent}>
          <MobileIcon name="globe" color="#1f2937" size={16} />
          <Text style={styles.buttonText}>{t('accessibility.languageSelector')}</Text>
        </View>
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('accessibility.languageSelector')}</Text>

            {languages.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageOption,
                  i18n.language === lang.code && styles.activeLanguageOption,
                ]}
                onPress={() => handleLanguageChange(lang.code)}
              >
                <Text
                  style={[
                    styles.languageOptionText,
                    i18n.language === lang.code && styles.activeLanguageOptionText,
                  ]}
                >
                  {lang.name}
                </Text>
                {i18n.language === lang.code && (
                  <MobileIcon name="check" color="#0a7d6c" size={16} strokeWidth={2.5} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}
