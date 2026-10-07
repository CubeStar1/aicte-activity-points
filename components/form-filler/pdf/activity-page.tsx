import { Fragment } from "react";
import { Page, View, Text, Image } from "@react-pdf/renderer";
import { Activity } from "@/lib/types/form-filler";
import { styles } from "./styles";
import { ActivityHeader, ActivityFooter } from "./common";
import { formatDateRange } from "./utils";

interface ActivityPagesProps {
  activities: Activity[];
  department: string;
}

// All reports share one wrapping page, each starting on a fresh sheet, so the
// footer can number them from 1 without knowing how many pages the index and
// evaluation sheets ended up taking.
export const ActivityPages = ({ activities, department }: ActivityPagesProps) => {
  if (activities.length === 0) return null;

  return (
    <Page size="A4" orientation="portrait" style={styles.pagePortrait}>
      <ActivityHeader />
      {activities.map((activity, index) => (
        <Fragment key={activity.id}>
          <View style={styles.activityTable} break={index > 0}>
            <View style={styles.activityRow}>
              <Text style={styles.activityLabel}>Sl. No.</Text>
              <Text style={styles.activityValue}>{index + 1}</Text>
            </View>
            <View style={styles.activityRow}>
              <Text style={styles.activityLabel}>Date & Duration</Text>
              <Text style={styles.activityValue}>
                {formatDateRange(activity)}
              </Text>
            </View>
            <View style={styles.activityRow}>
              <Text style={styles.activityLabel}>Activity Name</Text>
              <Text style={styles.activityValue}>{activity.name}</Text>
            </View>
            <View style={styles.activityRow}>
              <Text style={styles.activityLabel}>
                Description of the activity
              </Text>
              <Text style={styles.descriptionCell}>{activity.description}</Text>
            </View>
            {activity.photos && activity.photos.length > 0 && (
              <View style={styles.activityRow}>
                <Text style={styles.activityLabel}>Photos</Text>
                <View style={styles.photosCell}>
                  <View style={styles.photosContainer}>
                    {activity.photos.map((photo, idx) => (
                      <Image key={idx} src={photo} style={styles.photo} />
                    ))}
                  </View>
                </View>
              </View>
            )}
            <View style={styles.activityRow}>
              <Text style={styles.activityLabel}>Outcome</Text>
              <Text style={styles.outcomeCell}>{activity.outcomes}</Text>
            </View>
            <View style={styles.activityRow}>
              <Text style={styles.activityLabel}>Points earned</Text>
              <Text style={styles.activityValue}>{activity.pointsEarned}</Text>
            </View>
          </View>
          {activity.certificateAttached && activity.certificateImage && (
            <Image
              src={activity.certificateImage}
              style={styles.certificateImage}
            />
          )}
        </Fragment>
      ))}
      <ActivityFooter department={department || ""} />
    </Page>
  );
};
