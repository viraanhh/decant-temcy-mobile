import { useState } from "react";
import { View, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";
import { getProductImageUrl } from "../constants/api";

export default function ProductImage({ filename, style, iconSize = 24 }) {
  const [failed, setFailed] = useState(false);
  const uri = getProductImageUrl(filename);

  if (!uri || failed) {
    return (
      <View style={[{ backgroundColor: COLORS.surfaceLight, alignItems: "center", justifyContent: "center" }, style]}>
        <Ionicons name="image-outline" size={iconSize} color={COLORS.textFaint} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={style}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  );
}