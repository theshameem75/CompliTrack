import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listAssignments, listCertificates, listCompletions, listCourses, listSettings } from "./complianceApi";

export function useComplianceData() {
  const courses = useQuery({ queryKey: ["compliance", "courses"], queryFn: listCourses });
  const assignments = useQuery({ queryKey: ["compliance", "assignments"], queryFn: listAssignments });
  const completions = useQuery({ queryKey: ["compliance", "completions"], queryFn: listCompletions });
  const certificates = useQuery({ queryKey: ["compliance", "certificates"], queryFn: listCertificates });
  const settings = useQuery({ queryKey: ["compliance", "settings"], queryFn: listSettings });
  return { assignments, certificates, completions, courses, settings };
}

export function useRefreshCompliance() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: ["compliance"] });
}
