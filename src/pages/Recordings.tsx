import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";

type Recording = {
  id: string;
  user_id: string;
  question_id: number;
  audio_url: string;
  created_at: string;
};

const Recordings = () => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRecordings();
  }, []);

  const fetchRecordings = async () => {
    try {
      const { data, error } = await supabase
        .from("recordings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRecordings(data || []);
    } catch (error) {
      console.error("Error fetching recordings:", error);
      toast.error("Failed to load recordings");
    } finally {
      setLoading(false);
    }
  };

  const downloadRecording = async (recording: Recording) => {
    try {
      setDownloadingId(recording.id);
      
      // Extract the file path from the audio_url
      const url = new URL(recording.audio_url);
      const pathParts = url.pathname.split('/');
      const filePath = pathParts.slice(pathParts.indexOf('recordings') + 1).join('/');

      // Download the file from storage
      const { data, error } = await supabase.storage
        .from('recordings')
        .download(filePath);

      if (error) throw error;

      // Create a download link
      const downloadUrl = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `recording_${recording.id}_${new Date(recording.created_at).toLocaleDateString()}.webm`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast.success("Recording downloaded");
    } catch (error) {
      console.error("Error downloading recording:", error);
      toast.error("Failed to download recording");
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
        <h1 className="text-4xl font-bold mb-8">Recordings</h1>
        
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
