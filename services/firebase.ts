
// Mock Firebase for demonstration purposes
export const auth = {
  currentUser: { email: 'demo@ahastudio.ai', emailVerified: true },
  onAuthStateChanged: (callback: (user: any) => void) => {
    callback({ email: 'demo@ahastudio.ai', emailVerified: true });
    return () => {};
  },
  signOut: async () => {
    console.log("Mock Sign Out");
  }
};

export const onAuthStateChanged = (authObj: any, callback: (user: any) => void) => {
  return authObj.onAuthStateChanged(callback);
};

export const signOut = async (authObj: any) => {
  return await authObj.signOut();
};
