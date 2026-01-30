import React from 'react';
import { Snackbar } from 'react-native-paper';

interface CopySnackbarProps {
  visible: boolean;
  onDismiss: () => void;
  message?: string;
}

const CopySnackbar: React.FC<CopySnackbarProps> = ({ 
  visible, 
  onDismiss,
  message = 'Copied!'
}) => {
  return (
    <Snackbar
      visible={visible}
      onDismiss={onDismiss}
      duration={2000}
      style={{
        position: 'absolute',
        bottom: 100,
        alignSelf: 'center',
      }}
    >
      {message}
    </Snackbar>
  );
};

export default CopySnackbar;
