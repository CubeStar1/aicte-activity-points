import { Page, View, Text } from "@react-pdf/renderer";
import { FormFillerData, Activity } from "@/lib/types/form-filler";
import { styles } from "./styles";
import { Header, Footer } from "./common";
import { formatDateRange } from "./utils";

interface IndexPagesProps {
  activities: Activity[];
  student: FormFillerData["student"];
}

// Row heights depend on how the text wraps, so the sheet is one wrapping page:
// react-pdf breaks the table between rows (a row is never split) and repeats
// the header row on every page the table spills onto.
export const IndexPages = ({ activities, student }: IndexPagesProps) => {
  const rows =
    activities.length > 0
      ? activities.map((activity, idx) => (
          <View key={activity.id} style={styles.tableRow} wrap={false}>
            <Text style={[styles.tableCell, { width: "5%" }]}>{idx + 1}</Text>
            <Text style={[styles.tableCell, { width: "8%" }]}>
              {activity.semester}
            </Text>
            <Text style={[styles.tableCell, { width: "18%" }]}>
              {activity.name}
            </Text>
            <Text style={[styles.tableCell, { width: "12%" }]}>
              {activity.aicteMapping}
            </Text>
            <Text style={[styles.tableCell, { width: "12%" }]}>
              {formatDateRange(activity)}
            </Text>
            <Text style={[styles.tableCell, { width: "12%" }]}>
              {activity.place}
            </Text>
            <Text style={[styles.tableCell, { width: "8%" }]}>
              {activity.detailedReportPageNo || ""}
            </Text>
            <Text style={[styles.tableCell, { width: "10%" }]}>
              {activity.certificateAttached ? "Y" : "N"}
            </Text>
            <Text style={[styles.tableCell, { width: "7%" }]}>
              {activity.pointsEarned}
            </Text>
            <Text style={[styles.tableCellLast, { width: "8%" }]}></Text>
          </View>
        ))
      : [
          <View key="empty" style={styles.tableRow}>
            <Text
              style={[
                styles.tableCellLast,
                { width: "100%", color: "#999", fontStyle: "italic" },
              ]}
            >
              No activities added
            </Text>
          </View>,
        ];

  return (
    <Page size="A4" orientation="landscape" style={styles.pageLandscape}>
      <Header />

      <Text style={styles.sectionTitle}>AICTE-Activity Book</Text>
      <View style={styles.studentInfoLine}>
        <Text>
          <Text style={{ fontWeight: "bold" }}>Name:</Text>{" "}
          {student.name || "Student Name"}
        </Text>
        <Text>
          <Text style={{ fontWeight: "bold" }}>USN:</Text>{" "}
          {student.usn || "USN"}
        </Text>
      </View>
      <Text style={styles.subsectionTitle}>Index sheet</Text>

      <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableHeader]} fixed>
          <Text style={[styles.tableCell, { width: "5%" }]}>Sl. No</Text>
          <Text style={[styles.tableCell, { width: "8%" }]}>Semester</Text>
          <Text style={[styles.tableCell, { width: "18%" }]}>
            Name of the Activity
          </Text>
          <Text style={[styles.tableCell, { width: "12%" }]}>
            Map to AICTE Activity
          </Text>
          <Text style={[styles.tableCell, { width: "12%" }]}>
            Date (from & to) duration
          </Text>
          <Text style={[styles.tableCell, { width: "12%" }]}>
            Place where activity was carried
          </Text>
          <Text style={[styles.tableCell, { width: "8%" }]}>
            Detailed report Page No
          </Text>
          <Text style={[styles.tableCell, { width: "10%" }]}>
            Certificate / Proof Attached (Y/N)
          </Text>
          <Text style={[styles.tableCell, { width: "7%" }]}>
            Points attained
          </Text>
          <Text style={[styles.tableCellLast, { width: "8%" }]}>
            Signature of the counsellor
          </Text>
        </View>

        {rows.slice(0, -1)}
        <View style={styles.tableEnd} wrap={false}>
          {rows[rows.length - 1]}
          <View style={styles.hodSignatureSection}>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Signature of HoD</Text>
            </View>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>
                Signature of NCC/NSS officer/DSA/Dean CAT
              </Text>
            </View>
          </View>
        </View>
      </View>

      <Footer />
    </Page>
  );
};
