import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { UserProvider } from '@/context/userContext';
import { MeetingProvider } from '@/context/meetingContext';
import { RecordingProvider } from "@/context/recordingContext";
import ClientLayout from "./ClientLayout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "STENOVAULT",
  description: "Ai ambient clinical note taking",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <RecordingProvider>
        <UserProvider>
          <MeetingProvider>
            <ClientLayout>
              {children}
              </ClientLayout>
            </MeetingProvider>
        </UserProvider>
        </RecordingProvider>
      </body>
    </html>
  );
}
