import { INestApplication, CanActivate, ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { ProfilesController } from '../../src/profiles/profiles.controller';
import { ProfilesService } from '../../src/profiles/profiles.service';
import { JwtAuthGuard } from '../../src/common/guards/auth.guard';

const USER_ID = '11111111-1111-4111-8111-111111111111';

const authGuardStub: CanActivate = {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    req.user = { userId: USER_ID, phone: '9876543210', role: 'member' };
    return true;
  },
};

describe('Profiles HTTP e2e (validation + routing)', () => {
  let app: INestApplication;
  let profilesService: jest.Mocked<ProfilesService>;

  beforeAll(async () => {
    const mockProfilesService = {
      completeRegistration: jest.fn(),
      getMyProfile: jest.fn(),
      updateMyProfile: jest.fn(),
      addPhoto: jest.fn(),
      deletePhoto: jest.fn(),
      reorderPhotos: jest.fn(),
      getProfileById: jest.fn(),
      recordVisit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfilesController],
      providers: [{ provide: ProfilesService, useValue: mockProfilesService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(authGuardStub)
      .compile();

    app = module.createNestApplication();
    await app.init();
    profilesService = module.get(ProfilesService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('PATCH /profiles/me accepts null enum clears and preference fields', async () => {
    profilesService.updateMyProfile.mockResolvedValue({
      profile: { id: 'prof-1', aboutMe: 'Updated' },
      family: { familyValues: 'Moderate' },
      photos: [],
      verificationStatus: 'idle',
    } as any);

    const res = await request(app.getHttpServer())
      .patch('/profiles/me')
      .send({
        aboutMe: 'Updated',
        educationLevel: null,
        employmentStatus: null,
        gender: 'Female',
        dobDay: '12',
        dobMonth: '03',
        dobYear: '1996',
        prefAgeMin: 24,
        prefAgeMax: 30,
        prefReligions: ['Hindu'],
        manglik: "Don't know",
      })
      .expect(200);

    expect(profilesService.updateMyProfile).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({
        aboutMe: 'Updated',
        educationLevel: null,
        employmentStatus: null,
        prefAgeMin: 24,
        manglik: "Don't Know",
      }),
    );
    expect(res.body.profile.aboutMe).toBe('Updated');
  });

  it('PATCH /profiles/me accepts the basic partner-preference set', async () => {
    profilesService.updateMyProfile.mockResolvedValue({
      profile: { id: 'prof-1' },
      preferences: {
        prefAgeMin: 25,
        prefAgeMax: 32,
        prefHeightMinCm: 150,
        prefHeightMaxCm: 185,
        prefMaritalStatuses: ['Never Married'],
        prefReligions: ['Hindu'],
        prefCastes: ['Brahmin'],
        prefMotherTongues: ['Tamil'],
        prefMinEducation: 'Bachelors',
        prefLocations: ['Chennai'],
      },
      photos: [],
      verificationStatus: 'idle',
    } as any);

    await request(app.getHttpServer())
      .patch('/profiles/me')
      .send({
        prefAgeMin: 25,
        prefAgeMax: 32,
        prefHeightMinCm: 150,
        prefHeightMaxCm: 185,
        prefMaritalStatuses: ['Never Married'],
        prefReligions: ['Hindu'],
        prefCastes: ['Brahmin'],
        prefMotherTongues: ['Tamil'],
        prefMinEducation: 'Bachelors',
        prefLocations: ['Chennai'],
      })
      .expect(200);

    expect(profilesService.updateMyProfile).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({
        prefAgeMin: 25,
        prefAgeMax: 32,
        prefHeightMinCm: 150,
        prefHeightMaxCm: 185,
        prefMaritalStatuses: ['Never Married'],
        prefReligions: ['Hindu'],
        prefCastes: ['Brahmin'],
        prefMotherTongues: ['Tamil'],
        prefMinEducation: 'Bachelors',
        prefLocations: ['Chennai'],
      }),
    );
  });

  it('PATCH /profiles/me rejects inverted preference ranges', async () => {
    await request(app.getHttpServer())
      .patch('/profiles/me')
      .send({ prefAgeMin: 35, prefAgeMax: 25 })
      .expect(400);

    await request(app.getHttpServer())
      .patch('/profiles/me')
      .send({ prefHeightMinCm: 185, prefHeightMaxCm: 150 })
      .expect(400);

    expect(profilesService.updateMyProfile).not.toHaveBeenCalled();
  });

  it('PATCH /profiles/me accepts horoscope fields and null clears', async () => {
    profilesService.updateMyProfile.mockResolvedValue({
      profile: { id: 'prof-1' },
      horoscope: {
        birthTime: '10:45 AM',
        birthPlace: 'Madurai',
        manglik: 'No',
        rashi: 'Mesha',
        nakshatra: 'Ashwini',
        horoscopeS3Key: 'profiles/u1/horoscopes/a.pdf',
        horoscopeFileName: 'kundli.pdf',
        horoscopeFileSizeBytes: 2048,
      },
      photos: [],
      verificationStatus: 'idle',
    } as any);

    await request(app.getHttpServer())
      .patch('/profiles/me')
      .send({
        birthTime: '10:45 AM',
        birthPlace: 'Madurai',
        manglik: 'No',
        rashi: 'Mesha',
        nakshatra: 'Ashwini',
        horoscopeS3Key: 'profiles/u1/horoscopes/a.pdf',
        horoscopeFileName: 'kundli.pdf',
        horoscopeFileSizeBytes: 2048,
      })
      .expect(200);

    expect(profilesService.updateMyProfile).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({
        birthTime: '10:45 AM',
        birthPlace: 'Madurai',
        manglik: 'No',
        rashi: 'Mesha',
        nakshatra: 'Ashwini',
        horoscopeFileName: 'kundli.pdf',
        horoscopeFileSizeBytes: 2048,
      }),
    );

    profilesService.updateMyProfile.mockClear();
    profilesService.updateMyProfile.mockResolvedValue({
      profile: { id: 'prof-1' },
      horoscope: {
        birthTime: null,
        birthPlace: null,
        manglik: "Don't Know",
        rashi: null,
        nakshatra: null,
        horoscopeS3Key: null,
        horoscopeFileName: null,
        horoscopeFileSizeBytes: null,
      },
      photos: [],
      verificationStatus: 'idle',
    } as any);

    await request(app.getHttpServer())
      .patch('/profiles/me')
      .send({
        birthTime: null,
        birthPlace: '',
        rashi: null,
        nakshatra: '',
        horoscopeS3Key: null,
        horoscopeFileName: '',
        horoscopeFileSizeBytes: 0,
      })
      .expect(200);

    expect(profilesService.updateMyProfile).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({
        birthTime: null,
        birthPlace: null,
        rashi: null,
        nakshatra: null,
        horoscopeS3Key: null,
        horoscopeFileName: null,
        horoscopeFileSizeBytes: null,
      }),
    );
  });

  it('PATCH /profiles/me rejects invalid diet enum with 400 (no soft-drop)', async () => {
    await request(app.getHttpServer())
      .patch('/profiles/me')
      .send({ aboutMe: 'Keep', diet: 'Occasional Non-vegetarian' })
      .expect(400);

    expect(profilesService.updateMyProfile).not.toHaveBeenCalled();
  });

  it('PATCH /profiles/me clears diet/smoking/alcohol to null', async () => {
    profilesService.updateMyProfile.mockResolvedValue({
      profile: { id: 'prof-1', aboutMe: 'Keep' },
      photos: [],
      verificationStatus: 'idle',
    } as any);

    await request(app.getHttpServer())
      .patch('/profiles/me')
      .send({ diet: '', smoking: '', alcohol: '', companySector: '' })
      .expect(200);

    const payload = profilesService.updateMyProfile.mock.calls.at(-1)?.[1] as Record<string, unknown>;
    expect(payload.diet).toBeNull();
    expect(payload.smoking).toBeNull();
    expect(payload.alcohol).toBeNull();
    expect(payload.companySector).toBeNull();
  });

  it('PATCH /profiles/me rejects invalid fatherOccupation free text', async () => {
    await request(app.getHttpServer())
      .patch('/profiles/me')
      .send({ fatherOccupation: 'Software Engineer' })
      .expect(400);

    expect(profilesService.updateMyProfile).not.toHaveBeenCalled();
  });

  it('PATCH /profiles/me accepts family details and null clears', async () => {
    profilesService.updateMyProfile.mockResolvedValue({
      profile: { id: 'prof-1' },
      family: {
        familyType: 'Extended',
        familyValues: 'Traditional',
        familyStatus: 'Upper middle class',
        fatherOccupation: 'Retired',
        motherOccupation: 'Homemaker',
        brothersCount: 1,
        sistersCount: 2,
      },
      photos: [],
      verificationStatus: 'idle',
    } as any);

    await request(app.getHttpServer())
      .patch('/profiles/me')
      .send({
        familyType: 'Extended',
        familyValues: 'Traditional',
        familyStatus: 'Upper middle class',
        fatherOccupation: 'Retired',
        motherOccupation: 'Homemaker',
        brothersCount: 1,
        sistersCount: 2,
      })
      .expect(200);

    expect(profilesService.updateMyProfile).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({
        familyType: 'Extended',
        familyValues: 'Traditional',
        familyStatus: 'Upper middle class',
        fatherOccupation: 'Retired',
        motherOccupation: 'Homemaker',
        brothersCount: 1,
        sistersCount: 2,
      }),
    );
  });

  it('PATCH /profiles/me accepts null clears for family fields', async () => {
    profilesService.updateMyProfile.mockResolvedValue({
      profile: { id: 'prof-1' },
      family: null,
      photos: [],
      verificationStatus: 'idle',
    } as any);

    await request(app.getHttpServer())
      .patch('/profiles/me')
      .send({
        familyStatus: null,
        familyValues: null,
        fatherOccupation: null,
        motherOccupation: null,
      })
      .expect(200);

    expect(profilesService.updateMyProfile).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({
        familyStatus: null,
        familyValues: null,
        fatherOccupation: null,
        motherOccupation: null,
      }),
    );
  });

  it('PATCH /profiles/me rejects invalid height', async () => {
    await request(app.getHttpServer())
      .patch('/profiles/me')
      .send({ heightCm: 50 })
      .expect(400);

    expect(profilesService.updateMyProfile).not.toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({ heightCm: 50 }),
    );
  });

  it('PATCH /profiles/me accepts weightKg and complexion', async () => {
    profilesService.updateMyProfile.mockResolvedValue({
      profile: { id: 'prof-1', weightKg: 62, complexion: 'Fair' },
      photos: [],
      verificationStatus: 'idle',
    } as any);

    await request(app.getHttpServer())
      .patch('/profiles/me')
      .send({ weightKg: 62, complexion: 'Fair', disability: '' })
      .expect(200);

    expect(profilesService.updateMyProfile).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({
        weightKg: 62,
        complexion: 'Fair',
        disability: null,
      }),
    );
  });

  it('POST /profiles/complete-registration validates required identity fields', async () => {
    await request(app.getHttpServer())
      .post('/profiles/complete-registration')
      .send({ fullName: 'X' })
      .expect(400);

    expect(profilesService.completeRegistration).not.toHaveBeenCalled();
  });

  it('POST /profiles/complete-registration accepts a valid full payload', async () => {
    profilesService.completeRegistration.mockResolvedValue({
      success: true,
      message: 'ok',
      profileId: 'prof-1',
    });

    const payload = {
      profileFor: 'Myself',
      fullName: 'Ananya Sharma',
      gender: 'Female',
      dobDay: '15',
      dobMonth: '06',
      dobYear: '1998',
      maritalStatus: 'Never Married',
      heightCm: 162,
      city: 'Chennai',
      state: 'Tamil Nadu',
      religion: 'Hindu',
      caste: 'Brahmin',
      motherTongue: 'Tamil',
      familyValues: 'Moderate',
      familyType: 'Nuclear',
      fatherOccupation: 'Employed',
      motherOccupation: 'Homemaker',
      diet: 'Vegetarian',
      companySector: '',
      prefAgeMin: 25,
      prefAgeMax: 33,
      prefReligions: ['Hindu'],
      photoS3Keys: [
        `profiles/${USER_ID}/photos/22222222-2222-4222-8222-222222222222.jpeg`,
      ],
      verificationMethod: 'selfie',
      selfieS3Key: `verifications/${USER_ID}/selfie-33333333-3333-4333-8333-333333333333.jpeg`,
      govtIdType: 'PAN card',
      govtIdS3Key: `verifications/${USER_ID}/govt-id-44444444-4444-4444-8444-444444444444.pdf`,
    };

    await request(app.getHttpServer())
      .post('/profiles/complete-registration')
      .send(payload)
      .expect(201);

    expect(profilesService.completeRegistration).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({
        fullName: 'Ananya Sharma',
        companySector: undefined,
      }),
    );
  });

  it('GET /profiles/me returns owner profile from service', async () => {
    profilesService.getMyProfile.mockResolvedValue({
      profile: { id: 'prof-1', fullName: 'Ananya' },
      photos: [{ id: 'p1', s3Key: 'k', isPrimary: true, displayOrder: 0, status: 'pending' }],
      verificationStatus: 'idle',
    } as any);

    const res = await request(app.getHttpServer()).get('/profiles/me').expect(200);
    expect(res.body.photos[0].status).toBe('pending');
  });

  it('PATCH /profiles/me rejects invalid profileFor', async () => {
    const res = await request(app.getHttpServer())
      .patch('/profiles/me')
      .send({ profileFor: 'Friend' })
      .expect(400);

    expect(profilesService.updateMyProfile).not.toHaveBeenCalled();
    expect(res.body.message).toBeDefined();
  });

  it('PATCH /profiles/me rejects partial DOB', async () => {
    await request(app.getHttpServer())
      .patch('/profiles/me')
      .send({ dobDay: '15', dobMonth: '06' })
      .expect(400);

    expect(profilesService.updateMyProfile).not.toHaveBeenCalled();
  });

  it('PATCH /profiles/me rejects underage Male DOB', async () => {
    await request(app.getHttpServer())
      .patch('/profiles/me')
      .send({
        gender: 'Male',
        dobDay: '01',
        dobMonth: '01',
        dobYear: '2010',
      })
      .expect(400);

    expect(profilesService.updateMyProfile).not.toHaveBeenCalled();
  });

  it('PATCH /profiles/me strips createdBy and still updates allowed identity fields', async () => {
    profilesService.updateMyProfile.mockResolvedValue({
      profile: {
        id: 'prof-1',
        profileFor: 'Myself',
        fullName: 'Karthik Loganathan',
        gender: 'Male',
        dob: '1995-06-15',
        createdBy: 'self',
      },
      photos: [],
      verificationStatus: 'idle',
    } as any);

    await request(app.getHttpServer())
      .patch('/profiles/me')
      .send({
        profileFor: 'Myself',
        fullName: 'Karthik Loganathan',
        gender: 'Male',
        dobDay: '15',
        dobMonth: '06',
        dobYear: '1995',
        createdBy: 'staff',
      })
      .expect(200);

    expect(profilesService.updateMyProfile).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({
        profileFor: 'Myself',
        fullName: 'Karthik Loganathan',
        gender: 'Male',
        dobDay: '15',
        dobMonth: '06',
        dobYear: '1995',
      }),
    );
    expect(profilesService.updateMyProfile.mock.calls[0][1]).not.toHaveProperty('createdBy');
  });

  it('PATCH /profiles/me rejects free-text maritalStatus', async () => {
    await request(app.getHttpServer())
      .patch('/profiles/me')
      .send({ maritalStatus: 'Separated' })
      .expect(400);

    expect(profilesService.updateMyProfile).not.toHaveBeenCalled();
  });

  it('PATCH /profiles/me rejects Divorced without children answers', async () => {
    await request(app.getHttpServer())
      .patch('/profiles/me')
      .send({ maritalStatus: 'Divorced' })
      .expect(400);

    expect(profilesService.updateMyProfile).not.toHaveBeenCalled();
  });

  it('PATCH /profiles/me accepts Divorced with children fields', async () => {
    profilesService.updateMyProfile.mockResolvedValue({
      profile: {
        id: 'prof-1',
        maritalStatus: 'Divorced',
        hasChildren: true,
        childrenCount: 2,
        childrenLivingWithMe: true,
      },
      photos: [],
      verificationStatus: 'idle',
    } as any);

    await request(app.getHttpServer())
      .patch('/profiles/me')
      .send({
        maritalStatus: 'Divorced',
        hasChildren: true,
        childrenCount: 2,
        childrenLivingWithMe: true,
      })
      .expect(200);

    expect(profilesService.updateMyProfile).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({
        maritalStatus: 'Divorced',
        hasChildren: true,
        childrenCount: 2,
        childrenLivingWithMe: true,
      }),
    );
  });

  it('POST /profiles/complete-registration rejects Divorced without children', async () => {
    await request(app.getHttpServer())
      .post('/profiles/complete-registration')
      .send({
        profileFor: 'Myself',
        fullName: 'Ananya Sharma',
        gender: 'Female',
        dobDay: '15',
        dobMonth: '06',
        dobYear: '1998',
        maritalStatus: 'Divorced',
        city: 'Chennai',
        state: 'Tamil Nadu',
        religion: 'Hindu',
        caste: 'Brahmin',
        motherTongue: 'Tamil',
        familyValues: 'Moderate',
        familyType: 'Nuclear',
        fatherOccupation: 'Employed',
        motherOccupation: 'Homemaker',
      })
      .expect(400);

    expect(profilesService.completeRegistration).not.toHaveBeenCalled();
  });

  it('POST /profiles/complete-registration rejects an impossible DOB (Feb 30)', async () => {
    await request(app.getHttpServer())
      .post('/profiles/complete-registration')
      .send({
        profileFor: 'Myself',
        fullName: 'Ananya Sharma',
        gender: 'Female',
        dobDay: '30',
        dobMonth: '02',
        dobYear: '2000',
        maritalStatus: 'Never Married',
        city: 'Chennai',
        state: 'Tamil Nadu',
        religion: 'Hindu',
        caste: 'Brahmin',
        motherTongue: 'Tamil',
        familyValues: 'Moderate',
        familyType: 'Nuclear',
        fatherOccupation: 'Employed',
        motherOccupation: 'Homemaker',
      })
      .expect(400);

    expect(profilesService.completeRegistration).not.toHaveBeenCalled();
  });

  it('POST /profiles/complete-registration strips smuggled createdBy', async () => {
    profilesService.completeRegistration.mockResolvedValue({
      success: true,
      message: 'ok',
      profileId: 'prof-1',
    });

    await request(app.getHttpServer())
      .post('/profiles/complete-registration')
      .send({
        profileFor: 'Daughter',
        fullName: 'Ananya Sharma',
        gender: 'Female',
        dobDay: '15',
        dobMonth: '06',
        dobYear: '1998',
        maritalStatus: 'Never Married',
        city: 'Chennai',
        state: 'Tamil Nadu',
        religion: 'Hindu',
        caste: 'Brahmin',
        motherTongue: 'Tamil',
        familyValues: 'Moderate',
        familyType: 'Nuclear',
        fatherOccupation: 'Employed',
        motherOccupation: 'Homemaker',
        diet: 'Vegetarian',
        prefAgeMin: 25,
        prefAgeMax: 33,
        prefReligions: ['Hindu'],
        createdBy: 'staff',
      })
      .expect(201);

    expect(profilesService.completeRegistration).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({ profileFor: 'Daughter' }),
    );
    const forwarded = profilesService.completeRegistration.mock.calls.at(-1)?.[1] as unknown as Record<
      string,
      unknown
    >;
    expect(forwarded).not.toHaveProperty('createdBy');
  });

  it('PATCH /profiles/me allows gender-only change without DOB', async () => {
    profilesService.updateMyProfile.mockResolvedValue({
      profile: { id: 'prof-1', gender: 'Other' },
      photos: [],
      verificationStatus: 'idle',
    } as any);

    await request(app.getHttpServer())
      .patch('/profiles/me')
      .send({ gender: 'Other' })
      .expect(200);

    expect(profilesService.updateMyProfile).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({ gender: 'Other' }),
    );
  });

  it('POST /profiles/complete-registration rejects invalid profileFor', async () => {    await request(app.getHttpServer())
      .post('/profiles/complete-registration')
      .send({
        profileFor: 'Cousin',
        fullName: 'Ananya Sharma',
        gender: 'Female',
        dobDay: '15',
        dobMonth: '06',
        dobYear: '1998',
        maritalStatus: 'Never Married',
        heightCm: 162,
        city: 'Chennai',
        state: 'Tamil Nadu',
        religion: 'Hindu',
        caste: 'Brahmin',
        motherTongue: 'Tamil',
        familyValues: 'Moderate',
        familyType: 'Nuclear',
        fatherOccupation: 'Employed',
        motherOccupation: 'Homemaker',
      })
      .expect(400);

    expect(profilesService.completeRegistration).not.toHaveBeenCalled();
  });
});
