"use client";

import { Document } from "@react-pdf/renderer";
import { FormFillerData } from "@/lib/types/form-filler";
import { CertificatePage } from "./pdf/certificate-page";
import { IndexPages } from "./pdf/index-page";
import { EvaluationPages } from "./pdf/evaluation-page";
import { ActivityPages } from "./pdf/activity-page";
import { PreamblePage } from "./pdf/preamble-page";

interface PDFDocumentProps {
  data: FormFillerData;
}

export const PDFDocumentTemplate = ({ data }: PDFDocumentProps) => {
  const { student, activities, evaluations, signatories } = data;

  return (
    <Document>
      <CertificatePage data={data} />

      <IndexPages activities={activities} student={student} />

      <EvaluationPages evaluations={evaluations} signatories={signatories} />

      <ActivityPages activities={activities} department={student.department} />

      <PreamblePage />
    </Document>
  );
};

export default PDFDocumentTemplate;
