'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { getSupabaseClient } from '@/lib/supabase/client';
import { AlertTriangle, CheckCircle, Download, FileSpreadsheet, Loader2, Upload, Users } from 'lucide-react';
import { useState } from 'react';

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export default function AdminUsersImportPage() {
  const supabase = getSupabaseClient();
  const { toast } = useToast();
  const [csvData, setCsvData] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const sampleCsv = `name,email,roll_no,batch,section
John Doe,john@example.com,2024001,2024,A
Jane Smith,jane@example.com,2024002,2024,A
Bob Wilson,bob@example.com,2024003,2024,B`;

  const handleImport = async () => {
    if (!csvData.trim()) {
      toast({ variant: 'destructive', title: 'Please enter CSV data' });
      return;
    }

    setImporting(true);
    setResult(null);

    try {
      const lines = csvData.trim().split('\n');
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
      
      // Validate headers
      const requiredHeaders = ['name', 'email'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
      }

      const importResult: ImportResult = { success: 0, failed: 0, errors: [] };

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length < headers.length) continue;

        const row: Record<string, string> = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx] || '';
        });

        try {
          // Create Supabase auth user with random password
          const tempPassword = `temp_${Math.random().toString(36).slice(2)}!`;
          
          // Note: In production, use Supabase admin API or invite flow
          // For now, we'll just create the profile
          const { error: profileError } = await supabase.from('profiles').insert({
            name: row.name,
            email: row.email,
            roll_no: row.roll_no || null,
            batch: row.batch || null,
            section: row.section || null,
            role: 'student',
            is_active: true,
          } as any);

          if (profileError) {
            throw profileError;
          }

          importResult.success++;
        } catch (error: any) {
          importResult.failed++;
          importResult.errors.push(`Row ${i}: ${row.email} - ${error.message}`);
        }
      }

      setResult(importResult);
      
      if (importResult.success > 0) {
        toast({
          variant: 'success',
          title: `Imported ${importResult.success} students`,
          description: importResult.failed > 0 ? `${importResult.failed} failed` : undefined,
        });
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: error.message });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Import <span className="text-gradient">Students</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          Bulk import students from CSV data
        </p>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            CSV Format
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your CSV should include the following columns:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <code className="text-xs bg-muted px-2 py-1 rounded">name *</code>
            <code className="text-xs bg-muted px-2 py-1 rounded">email *</code>
            <code className="text-xs bg-muted px-2 py-1 rounded">roll_no</code>
            <code className="text-xs bg-muted px-2 py-1 rounded">batch</code>
            <code className="text-xs bg-muted px-2 py-1 rounded">section</code>
          </div>
          <div className="p-4 bg-muted/30 rounded-lg">
            <p className="text-xs font-medium mb-2">Sample CSV:</p>
            <pre className="text-xs overflow-x-auto">{sampleCsv}</pre>
          </div>
          <Button variant="outline" size="sm" onClick={() => setCsvData(sampleCsv)}>
            <Download className="w-4 h-4 mr-2" />
            Use Sample Data
          </Button>
        </CardContent>
      </Card>

      {/* Import Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Paste CSV Data</Label>
            <Textarea
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              placeholder="name,email,roll_no,batch,section&#10;John Doe,john@example.com,2024001,2024,A"
              rows={10}
              className="font-mono text-sm"
            />
          </div>
          <Button variant="gradient" onClick={handleImport} disabled={importing}>
            {importing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Users className="w-4 h-4 mr-2" />
            )}
            {importing ? 'Importing...' : 'Import Students'}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Import Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-4 rounded-lg bg-success/10 flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-success" />
                <div>
                  <p className="text-2xl font-bold text-success">{result.success}</p>
                  <p className="text-xs text-muted-foreground">Successfully imported</p>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-destructive/10 flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-destructive" />
                <div>
                  <p className="text-2xl font-bold text-destructive">{result.failed}</p>
                  <p className="text-xs text-muted-foreground">Failed to import</p>
                </div>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm font-medium mb-2">Errors:</p>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  {result.errors.slice(0, 10).map((error, idx) => (
                    <li key={idx}>• {error}</li>
                  ))}
                  {result.errors.length > 10 && (
                    <li>...and {result.errors.length - 10} more errors</li>
                  )}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
