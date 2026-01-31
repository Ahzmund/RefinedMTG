import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Changelog } from '../types';
import { generateChangelogHTML } from './pdfTemplateService';

export interface ExportPDFOptions {
  deckName: string;
  changelog: Changelog;
}

export const exportChangelogToPDF = async ({
  deckName,
  changelog,
}: ExportPDFOptions): Promise<void> => {
  try {
    // Generate HTML content
    const html = generateChangelogHTML(deckName, changelog);

    // Generate PDF
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    // Share the PDF
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `${deckName} - Suggestions`,
        UTI: 'com.adobe.pdf',
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }
  } catch (error) {
    console.error('Error exporting changelog to PDF:', error);
    throw error;
  }
};
