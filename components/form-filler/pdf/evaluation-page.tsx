import { Page, View, Text } from "@react-pdf/renderer";
import { FormFillerData, EvaluationEntry, Signatory } from "@/lib/types/form-filler";
import { styles } from "./styles";
import { Header, Footer } from "./common";

interface EvaluationPagesProps {
  evaluations: EvaluationEntry[];
  signatories: FormFillerData["signatories"];
}

const SignatoryBlock = ({
  signatory,
  fallbackName,
}: {
  signatory?: Signatory;
  fallbackName: string;
}) => (
  <View style={styles.signatureBlock}>
    <Text style={{ fontWeight: "bold", marginBottom: 3 }}>
      {signatory?.name || fallbackName}
    </Text>
    <Text style={{ marginBottom: 3 }}>
      {signatory?.designation || "Designation"}
    </Text>
    <View style={styles.signatureLine} />
    <Text style={styles.signatureLabel}>Signature</Text>
  </View>
);

// One wrapping page, paginated by react-pdf between rows: see IndexPages.
export const EvaluationPages = ({
  evaluations,
  signatories,
}: EvaluationPagesProps) => {
  const rows =
    evaluations.length > 0
      ? evaluations.map((evaluation, idx) => (
          <View key={idx} style={styles.tableRow} wrap={false}>
            <Text style={[styles.tableCell, { width: "6%" }]}>{idx + 1}</Text>
            <Text style={[styles.tableCell, { width: "18%" }]}>
              {evaluation.nameOfStudent}
            </Text>
            <Text style={[styles.tableCell, { width: "14%" }]}>
              {evaluation.usn}
            </Text>
            <Text style={[styles.tableCell, { width: "18%" }]}>
              {evaluation.typeOfWork}
            </Text>
            <Text style={[styles.tableCell, { width: "12%" }]}>
              {evaluation.duration}
            </Text>
            <Text style={[styles.tableCell, { width: "10%" }]}>
              {evaluation.hoursSpent || ""}
            </Text>
            <Text style={[styles.tableCell, { width: "12%" }]}>
              {evaluation.certificateAvailable ? "Y" : "N"}
            </Text>
            <Text style={[styles.tableCellLast, { width: "10%" }]}>
              {evaluation.pointsEarned}
            </Text>
          </View>
        ))
      : [
          <View key="empty" style={styles.tableRow}>
            <Text style={[styles.tableCell, { width: "6%" }]}>1</Text>
            <Text style={[styles.tableCell, { width: "18%" }]}></Text>
            <Text style={[styles.tableCell, { width: "14%" }]}></Text>
            <Text style={[styles.tableCell, { width: "18%" }]}></Text>
            <Text style={[styles.tableCell, { width: "12%" }]}></Text>
            <Text style={[styles.tableCell, { width: "10%" }]}></Text>
            <Text style={[styles.tableCell, { width: "12%" }]}></Text>
            <Text style={[styles.tableCellLast, { width: "10%" }]}></Text>
          </View>,
        ];

  return (
    <Page size="A4" orientation="landscape" style={styles.pageLandscape}>
      <Header />
      <Text style={styles.sectionTitle}>EVALUATION SHEET</Text>

      <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableHeader]} fixed>
          <Text style={[styles.tableCell, { width: "6%" }]}>Sl. No</Text>
          <Text style={[styles.tableCell, { width: "18%" }]}>
            Name of Student
          </Text>
          <Text style={[styles.tableCell, { width: "14%" }]}>USN</Text>
          <Text style={[styles.tableCell, { width: "18%" }]}>
            Type of work carried
          </Text>
          <Text style={[styles.tableCell, { width: "12%" }]}>Duration</Text>
          <Text style={[styles.tableCell, { width: "10%" }]}>
            Number of hours spent
          </Text>
          <Text style={[styles.tableCell, { width: "12%" }]}>
            Availability of Certificate (Y/N)
          </Text>
          <Text style={[styles.tableCellLast, { width: "10%" }]}>
            Points earned
          </Text>
        </View>
        {rows.slice(0, -1)}
        <View style={styles.tableEnd} wrap={false}>
          {rows[rows.length - 1]}
          <View style={styles.evaluatorSignatureSection}>
            <SignatoryBlock
              signatory={signatories?.evaluator1}
              fallbackName="Name of Evaluator 1"
            />
            <SignatoryBlock
              signatory={signatories?.evaluator2}
              fallbackName="Name of Evaluator 2"
            />
            <SignatoryBlock
              signatory={signatories?.counsellor}
              fallbackName="Name of Counsellor"
            />
          </View>
        </View>
      </View>

      <Footer />
    </Page>
  );
};
