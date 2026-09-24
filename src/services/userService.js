import apiClient from "./apiClient";

export async function getMyProfile() {
  const response = await apiClient.get("/users/profile");
  return response.data.user;
}

// avatarUri opsional — kalau ada, dikirim sebagai multipart file.
export async function updateProfile(fields, avatarUri) {
  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null) formData.append(key, value);
  });

  if (avatarUri) {
    formData.append("avatar", {
      uri: avatarUri,
      name: "avatar.jpg",
      type: "image/jpeg",
    });
  }

  const response = await apiClient.put("/users/profile", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data.user;
}

export async function changeMyPassword(oldPassword, newPassword) {
  const response = await apiClient.put("/users/change-password", {
    old_password: oldPassword,
    new_password: newPassword,
  });
  return response.data;
}