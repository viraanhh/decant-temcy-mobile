import { View, ScrollView, StyleSheet } from "react-native";
import { COLORS } from "../constants/colors";
import useKeyboardHeight from "../hooks/useKeyboardHeight";

export default function KeyboardAvoidingScreen({ children, contentContainerStyle, style }) {
  const keyboardHeight = useKeyboardHeight();

  return (
    <View style={[styles.flex, style]}>
      <ScrollView
        keyboardDismissMode="on-drag"
        style={styles.flex}
        contentContainerStyle={[
          styles.contentContainer,
          contentContainerStyle,
          { paddingBottom: keyboardHeight },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  contentContainer: { 
    flexGrow: 1 
  },
});