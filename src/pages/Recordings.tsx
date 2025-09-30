import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Download, Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { getSessionToken } from "@/lib/sessionUtils";

type Recording = {
  id: string;
  user_id: string;
  question_id: number;
  audio_url: string;
  created_at: string;
};

const Recordings = () => {
  const navigate = useNavigate();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRecordings();
  }, []);

  const fetchRecordings = async () => {
    try {
      const sessionToken = getSessionToken();
      
      if (!sessionToken) {
        toast.error("Session expired. Please login again.");
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase.functions.invoke('get-recordings', {
        headers: {
          'x-session-token': sessionToken,
        },
      });

      if (error) throw error;
      
      if (data.error) {
        toast.error(data.error);
        navigate("/auth");
        return;
      }

      setRecordings(data.recordings || []);
    } catch (error) {
      console.error("Error fetching recordings:", error);
      toast.error("Failed to load recordings");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    sessionStorage.removeItem('admin_session_token');
    sessionStorage.removeItem('admin_session_expires');
    navigate("/auth");
  };

  const downloadRecording = async (recording: Recording) => {
    try {
      setDownloadingId(recording.id);
      
      const sessionToken = getSessionToken();
      
      if (!sessionToken) {
        toast.error("Session expired. Please login again.");
        navigate("/auth");
        return;
      }

      console.log("Starting download for recording:", recording.id);
      console.log("Audio URL:", recording.audio_url);
      
      // Extract the file path from the audio_url
      const url = new URL(recording.audio_url);
      const pathParts = url.pathname.split('/');
      
      // Find the index of 'recordings' or 'object' in the path
      let startIndex = pathParts.indexOf('recordings');
      if (startIndex === -1) {
        startIndex = pathParts.indexOf('object');
      }
      
      const filePath = pathParts.slice(startIndex + 2).join('/');
      console.log("Extracted file path:", filePath);

      if (!filePath) {
        throw new Error("Could not extract file path from URL");
      }

      // Call edge function to get signed URL
      const { data, error } = await supabase.functions.invoke('download-recording', {
        headers: {
          'x-session-token': sessionToken,
        },
        body: {
          filePath: filePath
        }
      });

      if (error) {
        console.error("Edge function error:", error);
        throw error;
      }

      if (data.error) {
        console.error("Download error:", data.error);
        throw new Error(data.error);
      }

      if (!data.signedUrl) {
        throw new Error("No signed URL returned");
      }

      console.log("Signed URL received, downloading...");

      // Fetch the file using the signed URL
      const response = await fetch(data.signedUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }

      const blob = await response.blob();
      console.log("File downloaded, size:", blob.size, "bytes");

      // Create a download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `recording_${recording.question_id === 0 ? 'complete' : recording.question_id}_${new Date(recording.created_at).toLocaleDateString().replace(/\//g, '-')}.webm`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast.success("Recording downloaded");
    } catch (error) {
      console.error("Error downloading recording:", error);
      toast.error(`Failed to download recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="container mx-auto max-w-6xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Recordings</h1>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
        
        <Card className="p-6">
          {recordings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No recordings found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Question</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recordings.map((recording) => (
                  <TableRow key={recording.id}>
                    <TableCell className="font-mono text-sm">
                      {recording.user_id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      {recording.question_id === 0 ? "Complete Recording" : `Question ${recording.question_id}`}
                    </TableCell>
                    <TableCell>
                      {new Date(recording.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadRecording(recording)}
                        disabled={downloadingId === recording.id}
                      >
                        {downloadingId === recording.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Recordings;
