export interface EducationLevelOption {
  id: number;
  name: string;
}

export interface SpecializationOption {
  id: number;
  name: string;
  educationId: number;
}

export interface ResolvedEducation {
  id: number;
  name: string;
}
