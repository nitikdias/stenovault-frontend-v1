import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MeetingProvider } from "@/context/meetingContext";
import { UserProvider } from "@/context/userContext";
import { RecordingProvider } from "@/context/recordingContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "ARCA EMR LITE",
  description: "Ai ambient clinical note taking",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <RecordingProvider>
        <UserProvider>
          <MeetingProvider>{children}</MeetingProvider>
        </UserProvider>
        </RecordingProvider>
      </body>
    </html>
  );
}
