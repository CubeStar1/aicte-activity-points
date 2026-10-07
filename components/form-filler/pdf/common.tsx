import { View, Text, Image } from "@react-pdf/renderer";
import { styles } from "./styles";

export const Header = () => (
  <View style={styles.header}>
    <View style={styles.logoSection}>
      <Image src="/rvce-logo.png" style={styles.logo} />
      <View style={styles.collegeInfo}>
        <Text style={styles.collegeName}>RV College of Engineering®</Text>
        <Text style={styles.collegeAddress}>
          Mysore Road, RV Vidyaniketan Post,
        </Text>
        <Text style={styles.collegeAddress}>
          Bengaluru - 560059, Karnataka, India
        </Text>
      </View>
    </View>
    <View style={styles.contactInfo}>
      <Text>principal@rvce.edu.in</Text>
      <Text>www.rvce.edu.in</Text>
      <Text>Tel: +91-80-68188110</Text>
      <Text>+91-80-68188111</Text>
      <Text>+91-80-68188112</Text>
    </View>
  </View>
);

export const Footer = () => (
  <View style={styles.footer} fixed>
    <Text style={styles.trustName}>Rashtreeya Sikshana Samithi Trust®</Text>
    <Text style={styles.motto}>Go, change the world®</Text>
  </View>
);

export const ActivityHeader = () => (
  <View style={styles.activityHeader} fixed>
    <Text style={{ textAlign: "center", width: "100%" }}>
      RV College of Engineering® Bengaluru
    </Text>
  </View>
);

export const ActivityFooter = ({ department }: { department: string }) => (
  <View style={styles.activityFooter} fixed>
    <Text style={{ width: "30%" }}>AICTE Activity Points</Text>
    <View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 5,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Position within the activity pages, so numbering starts at 1 here. */}
      <Text render={({ subPageNumber }) => `${subPageNumber}`} />
    </View>
    <View style={{ width: "30%", alignItems: "flex-end" }}>
      <Text style={{ textAlign: "right" }}>Department of {department}</Text>
    </View>
  </View>
);
