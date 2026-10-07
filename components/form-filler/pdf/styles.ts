import { StyleSheet, Font } from "@react-pdf/renderer";

Font.register({
  family: "Inter",
  fonts: [
    {
      src: "/fonts/inter/Inter-roman.ttf",
      fontWeight: 400,
    },
    {
      src: "/fonts/inter/Inter-italic.ttf",
      fontWeight: 400,
      fontStyle: "italic",
    },
    {
      src: "/fonts/inter/Inter-roman.ttf",
      fontWeight: 600,
    },
    {
      src: "/fonts/inter/Inter-roman.ttf",
      fontWeight: 700,
    },
  ],
});

Font.register({
  family: "Arial",
  fonts: [
    {
      src: "/fonts/arial/arial.ttf",
      fontWeight: 400,
    },
    {
      src: "/fonts/arial/G_ari_bd.TTF",
      fontWeight: 700,
    },
    {
      src: "/fonts/arial/G_ari_i.TTF",
      fontWeight: 400,
      fontStyle: "italic",
    },
  ],
});

Font.registerHyphenationCallback((word) => [word]);

// The signature blocks sit in flow below the table rather than at a fixed page
// position, so a long table can't run underneath them: if they don't fit they
// move to the next page (see tableEnd). Growing into the leftover space and
// aligning to its bottom still lands them at the foot of the page they end on.
const signatureSectionFlow = {
  flexGrow: 1,
  alignItems: "flex-end",
  marginTop: 10,
  paddingBottom: 15,
} as const;

export const styles = StyleSheet.create({
  page: {
    padding: 40,
    paddingBottom: 80,
    fontFamily: "Times-Roman",
    fontSize: 11,
    color: "#000",
  },
  pagePortrait: {
    paddingTop: 60,
    paddingBottom: 60,
    paddingLeft: 40,
    paddingRight: 40,
    fontFamily: "Times-Roman",
    fontSize: 11,
    color: "#000",
  },
  pageLandscape: {
    padding: 30,
    paddingBottom: 65,
    fontFamily: "Times-Roman",
    fontSize: 10,
    color: "#000",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    paddingBottom: 8,
    borderBottomWidth: 1.5,
    borderBottomColor: "#1e3a5f",
    fontFamily: "Arial",
  },
  logoSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    width: 60,
    height: 60,
  },
  collegeInfo: {
    flexDirection: "column",
  },
  collegeName: {
    fontSize: 16,
    fontWeight: 700,
    color: "#1e3a5f",
    fontFamily: "Arial",
    letterSpacing: 0.3,
  },
  collegeAddress: {
    fontSize: 9,
    color: "#1e3a5f",
    fontFamily: "Arial",
    marginTop: 2,
  },
  contactInfo: {
    textAlign: "right",
    fontSize: 9,
    color: "#1e3a5f",
    fontFamily: "Arial",
    lineHeight: 1.4,
  },

  footer: {
    position: "absolute",
    bottom: 25,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1.5,
    borderTopColor: "#1e3a5f",
    fontFamily: "Arial",
  },
  trustName: {
    fontSize: 10,
    fontWeight: 600,
    color: "#1e3a5f",
    fontFamily: "Arial",
  },
  motto: {
    fontSize: 10,
    fontStyle: "italic",
    color: "#1e3a5f",
    fontFamily: "Arial",
  },

  certificateContent: {
    marginTop: 60,
    alignItems: "center",
  },
  certificateTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1e3a5f",
    textDecoration: "underline",
    marginBottom: 40,
  },
  certificateText: {
    fontSize: 13,
    lineHeight: 2,
    textAlign: "justify",
    maxWidth: "90%",
    paddingHorizontal: 20,
  },
  signatureSection: {
    position: "absolute",
    bottom: 120,
    left: 40,
    right: 40,
  },
  signatureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 40,
  },
  signatureBlock: {
    width: "45%",
    alignItems: "center",
  },
  signatureLine: {
    width: 150,
    height: 30,
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    marginBottom: 5,
  },
  signatureLabel: {
    fontSize: 10,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
  },
  subsectionTitle: {
    fontSize: 12,
    textAlign: "center",
    marginBottom: 10,
  },
  studentInfoLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
    fontSize: 11,
  },

  // The frame is drawn by the rows, not the table: a table split across pages
  // is stretched to the bottom of the page, and its own border would trail
  // down past the last row.
  table: {
    width: "100%",
    flexGrow: 1,
  },
  // Unbreakable wrapper around the last row and the signatures, so signatures
  // pushed to a new page take a row with them instead of sitting there alone.
  tableEnd: {
    flexGrow: 1,
  },
  tableRow: {
    flexDirection: "row",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#000",
  },
  tableHeader: {
    backgroundColor: "transparent",
    fontWeight: "bold",
    borderTopWidth: 1,
  },
  tableCell: {
    padding: 5,
    borderRightWidth: 1,
    borderRightColor: "#000",
    textAlign: "center",
    fontSize: 9,
  },
  tableCellLast: {
    padding: 5,
    textAlign: "center",
    fontSize: 9,
  },

  hodSignatureSection: {
    ...signatureSectionFlow,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 30,
  },
  evaluatorSignatureSection: {
    ...signatureSectionFlow,
    flexDirection: "row",
    justifyContent: "space-around",
  },

  activityTable: {
    width: "100%",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#000",
    marginTop: 0,
  },
  activityRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    minHeight: 30,
  },
  activityLabel: {
    width: 120,
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: "#000",
    fontSize: 10,
    textAlign: "center",
  },
  activityValue: {
    flex: 1,
    padding: 8,
    fontSize: 10,
    textAlign: "center",
  },
  descriptionCell: {
    flex: 1,
    padding: 8,
    fontSize: 10,
    textAlign: "justify",
  },
  photosCell: {
    flex: 1,
    padding: 8,
    fontSize: 10,
    minHeight: 80,
    color: "#999",
    fontStyle: "italic",
    textAlign: "center",
  },
  outcomeCell: {
    flex: 1,
    padding: 8,
    fontSize: 10,
    textAlign: "justify",
  },
  certificateNote: {
    marginTop: 15,
    fontSize: 10,
    fontStyle: "italic",
  },
  photosContainer: {
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
    marginTop: 5,
  },
  photo: {
    width: 320,
    height: 220,
    objectFit: "contain",
  },
  certificateImage: {
    width: "100%",
    height: 500,
    objectFit: "contain",
    marginTop: 20,
  },
  activityHeader: {
    position: "absolute",
    top: 25,
    left: 40,
    right: 40,
    height: 35,
    textAlign: "center",
    fontSize: 14,
    fontFamily: "Times-Roman",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    justifyContent: "center",
  },
  activityFooter: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    height: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#000",
    paddingTop: 5,
    fontSize: 10,
    fontFamily: "Times-Roman",
  },
});
