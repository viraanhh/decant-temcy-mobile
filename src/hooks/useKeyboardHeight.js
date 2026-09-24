import { useState, useEffect } from "react";
import { Keyboard, Platform } from "react-native";

// Hook ini melacak tinggi keyboard secara manual lewat event listener,
// TIDAK bergantung pada androidmanifest/softwareKeyboardLayoutMode sama
// sekali — jadi tetap reliable di Expo Go (yang tidak rebuild native config
// per project) maupun nanti di custom/production build.
//
// Pemakaian:
//   const keyboardHeight = useKeyboardHeight();
//   <View style={{ paddingBottom: keyboardHeight }}>...</View>
export default function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    // iOS: keyboardWillShow/Hide (animasi lebih halus, event sebelum keyboard muncul)
    // Android: keyboardDidShow/Hide (Android tidak selalu fire event "will")
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return keyboardHeight;
}