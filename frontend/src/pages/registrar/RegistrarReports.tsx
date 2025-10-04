import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Download, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Calendar,
  Clock,
  Users,
  GraduationCap,
  Target
} from 'lucide-react';

interface ReportData {
  report_type: string;
  generated_date: string;
  program_info: {
    registrar_name: string;
    aope: string;
    qualification_tier: string;
    fte_fraction: number;
    start_date: string;
    expected_end_date: string;
    actual_end_date?: string;
    program_status?: string;
  };
  hour_totals: {
    practice_hours: {
      total: number;
      target: number;
      percentage: number;
      met_target?: boolean;
    };
    dcc_hours: {
      total: number;
      per_fte_year: number;
      minimum_required: number;
      met_minimum?: boolean;
    };
    supervision_hours: {
      total: number;
      target: number;
      percentage: number;
      met_target?: boolean;
    };
    cpd_hours: {
      total: number;
      active_cpd?: number;
      target: number;
      percentage: number;
      met_target?: boolean;
    };
  };
  supervision_mix: {
    percentages: {
      principal: number;
      individual: number;
      group: number;
      shorter_than_60min: number;
      secondary_same_aope: number;
      secondary_other_or_not_endorsed: number;
    };
    compliance_status: string;
    warnings: string[];
    errors: string[];
  };
  compliance_summary?: {
    all_targets_met: boolean;
    supervision_compliant: boolean;
    dcc_compliant: boolean;
  };
  final_assessment?: {
    all_requirements_met: boolean;
    supervision_compliant: boolean;
    dcc_compliant: boolean;
    ready_for_endorsement: boolean;
  };
}

const RegistrarReports: React.FC = () => {
  const { programId } = useParams<{ programId: string }>();
  const [midpointReport, setMidpointReport] = useState<ReportData | null>(null);
  const [finalReport, setFinalReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      if (!programId) return;
      
      try {
        setLoading(true);
        
        // Fetch midpoint report
        const midpointResponse = await apiFetch(`/api/registrar/programs/${programId}/generate_midpoint_report/`);
        if (midpointResponse.ok) {
          const midpointData = await midpointResponse.json();
          setMidpointReport(midpointData);
        }
        
        // Fetch final report
        const finalResponse = await apiFetch(`/api/registrar/programs/${programId}/generate_final_report/`);
        if (finalResponse.ok) {
          const finalData = await finalResponse.json();
          setFinalReport(finalData);
        }
        
      } catch (err: any) {
        setError(err.message);
        toast.error('Failed to load reports');
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [programId]);

  const handleExportCSV = async (reportType: 'midpoint' | 'final') => {
    if (!programId) return;
    
    try {
      const response = await apiFetch(`/api/registrar/programs/${programId}/export_report_csv/?type=${reportType}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportType}_report_${programId}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast.success(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} report exported successfully`);
      } else {
        toast.error('Failed to export report');
      }
    } catch (err: any) {
      toast.error('Failed to export report');
    }
  };

  const handleExportZIP = async (reportType: 'midpoint' | 'final') => {
    if (!programId) return;
    
    try {
      const response = await apiFetch(`/api/registrar/programs/${programId}/export_report_zip/?type=${reportType}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportType}_report_package_${programId}_${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast.success(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} report package exported successfully`);
      } else {
        toast.error('Failed to export report package');
      }
    } catch (err: any) {
      toast.error('Failed to export report package');
    }
  };

  const getComplianceBadge = (status: string) => {
    switch (status) {
      case 'compliant':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="h-3 w-3 mr-1" />Compliant</Badge>;
      case 'non_compliant':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Non-Compliant</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertTriangle className="h-3 w-3 mr-1" />Warning</Badge>;
    }
  };

  const renderReportCard = (report: ReportData, reportType: 'midpoint' | 'final') => (
    <Card key={reportType} className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <CardTitle>{report.report_type} Report</CardTitle>
            <Badge variant="outline">{reportType}</Badge>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleExportCSV(reportType)}
            >
              <Download className="h-4 w-4 mr-1" />
              CSV
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleExportZIP(reportType)}
            >
              <Download className="h-4 w-4 mr-1" />
              ZIP
            </Button>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          Generated: {new Date(report.generated_date).toLocaleDateString()}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Program Information */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Program Information
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Registrar:</span> {report.program_info.registrar_name}
            </div>
            <div>
              <span className="font-medium">AoPE:</span> {report.program_info.aope}
            </div>
            <div>
              <span className="font-medium">Qualification Tier:</span> {report.program_info.qualification_tier}
            </div>
            <div>
              <span className="font-medium">FTE:</span> {report.program_info.fte_fraction}
            </div>
            <div>
              <span className="font-medium">Start Date:</span> {new Date(report.program_info.start_date).toLocaleDateString()}
            </div>
            <div>
              <span className="font-medium">End Date:</span> {new Date(report.program_info.expected_end_date).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Hour Totals */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Target className="h-4 w-4" />
            Hour Totals
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(report.hour_totals).map(([category, data]) => (
              <div key={category} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium capitalize">{category.replace('_', ' ')}</h4>
                  {data.met_target !== undefined && (
                    data.met_target ? 
                      <CheckCircle2 className="h-4 w-4 text-green-600" /> : 
                      <XCircle className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Current:</span>
                    <span className="font-medium">{data.total}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Target:</span>
                    <span>{data.target}</span>
                  </div>
                  <Progress value={data.percentage} className="h-2" />
                  <div className="text-xs text-gray-600 text-right">
                    {data.percentage.toFixed(1)}%
                  </div>
                  {category === 'dcc_hours' && (
                    <div className="text-xs text-gray-600">
                      Per FTE Year: {data.per_fte_year.toFixed(1)} / {data.minimum_required}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Supervision Mix */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Supervision Mix Compliance
          </h3>
          <div className="flex items-center gap-4 mb-4">
            {getComplianceBadge(report.supervision_mix.compliance_status)}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {Object.entries(report.supervision_mix.percentages).map(([key, percentage]) => (
              <div key={key} className="border rounded p-3">
                <div className="font-medium capitalize mb-1">
                  {key.replace('_', ' ')}
                </div>
                <div className="text-lg font-semibold">
                  {percentage.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
          
          {report.supervision_mix.warnings.length > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <h4 className="font-medium text-yellow-800 mb-2">Warnings:</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                {report.supervision_mix.warnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}
          
          {report.supervision_mix.errors.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
              <h4 className="font-medium text-red-800 mb-2">Errors:</h4>
              <ul className="text-sm text-red-700 space-y-1">
                {report.supervision_mix.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Compliance Summary */}
        {report.compliance_summary && (
          <div>
            <h3 className="font-semibold mb-3">Compliance Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm">All Targets Met:</span>
                {report.compliance_summary.all_targets_met ? 
                  <CheckCircle2 className="h-4 w-4 text-green-600" /> : 
                  <XCircle className="h-4 w-4 text-red-600" />
                }
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">Supervision Compliant:</span>
                {report.compliance_summary.supervision_compliant ? 
                  <CheckCircle2 className="h-4 w-4 text-green-600" /> : 
                  <XCircle className="h-4 w-4 text-red-600" />
                }
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">DCC Compliant:</span>
                {report.compliance_summary.dcc_compliant ? 
                  <CheckCircle2 className="h-4 w-4 text-green-600" /> : 
                  <XCircle className="h-4 w-4 text-red-600" />
                }
              </div>
            </div>
          </div>
        )}

        {/* Final Assessment */}
        {report.final_assessment && (
          <div>
            <h3 className="font-semibold mb-3">Final Assessment</h3>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium">Ready for Endorsement:</span>
                {report.final_assessment.ready_for_endorsement ? 
                  <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="h-3 w-3 mr-1" />Yes</Badge> : 
                  <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />No</Badge>
                }
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primaryBlue mx-auto mb-4"></div>
          <p>Loading reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Error Loading Reports</h2>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Registrar Reports</h1>
          <p className="text-gray-600">Generate and export PREA-76 and AECR-76 reports</p>
        </div>
      </div>

      <div className="space-y-6">
        {midpointReport && renderReportCard(midpointReport, 'midpoint')}
        {finalReport && renderReportCard(finalReport, 'final')}
        
        {!midpointReport && !finalReport && (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Reports Available</h2>
            <p className="text-gray-600">Reports will be generated when you have log entries.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegistrarReports;
