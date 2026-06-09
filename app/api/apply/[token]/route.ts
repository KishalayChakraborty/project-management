import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { uploadFile } from '@/lib/minio';

const publicApplicationSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  linkedinUrl: z.string().optional(),
  githubUrl: z.string().optional(),
  portfolioUrl: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  expectedSalaryMin: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.coerce.number().optional()
  ),
  expectedSalaryMax: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.coerce.number().optional()
  ),
  noticePeriodDays: z.preprocess(
    (val) => (val === '' || val === null ? 0 : val),
    z.coerce.number().min(0)
  ),
  education: z.array(
    z.object({
      degree: z.string(),
      institution: z.string(),
      fieldOfStudy: z.string().optional(),
      endYear: z.preprocess(
        (val) => (val === '' || val === null ? undefined : val),
        z.coerce.number().optional()
      ),
    })
  ),
  experience: z.array(
    z.object({
      company: z.string(),
      title: z.string(),
      description: z.string().optional(),
    })
  ),
  coverLetter: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const ad = await prisma.jobAdvertisement.findUnique({
      where: { publicToken: token },
      include: {
        jobProfile: {
          select: {
            title: true,
            description: true,
            level: true,
            employmentType: true,
            minExperienceYears: true,
            maxExperienceYears: true,
          },
        },
      },
    });

    if (!ad || ad.status === 'CLOSED') {
      return NextResponse.json(
        { error: 'Advertisement not found or closed' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: {
        id: ad.id,
        title: ad.title || ad.jobProfile.title,
        description: ad.adContent || ad.jobProfile.description,
        jobProfile: ad.jobProfile,
        salaryRangeMin: ad.salaryRangeMin,
        salaryRangeMax: ad.salaryRangeMax,
        location: ad.location,
        isRemote: ad.isRemote,
        deadline: ad.deadline,
      },
    });
  } catch (error) {
    console.error('Error fetching ad:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const ad = await prisma.jobAdvertisement.findUnique({
      where: { publicToken: token },
    });

    if (!ad || ad.status === 'CLOSED') {
      return NextResponse.json(
        { error: 'Advertisement not found or closed' },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const rawData = formData.get('data');
    const cvFile = formData.get('cv') as File | null;

    const data = publicApplicationSchema.parse(
      typeof rawData === 'string' ? JSON.parse(rawData) : rawData
    );

    const { education, experience, ...applicantData } = data;

    let cvMinioPath: string | null = null;
    let cvFileName: string | null = null;
    let cvFileSize: number | null = null;

    if (cvFile && cvFile.size > 0) {
      try {
        const buffer = await cvFile.arrayBuffer();
        const result = await uploadFile(
          Buffer.from(buffer),
          cvFile.name,
          cvFile.type,
          'hr-cvs'
        );
        cvMinioPath = result.path;
        cvFileName = cvFile.name;
        cvFileSize = cvFile.size;
      } catch (error) {
        console.error('Error uploading CV:', error);
        return NextResponse.json({ error: 'Failed to upload CV file' }, { status: 400 });
      }
    }

    const applicant = await prisma.applicant.create({
      data: {
        ...applicantData,
        orgId: ad.orgId,
        jobProfileId: ad.jobProfileId,
        advertisementId: ad.id,
        source: 'PUBLIC_LINK',
        status: 'NEW',
        internalNotes: data.coverLetter,
        cvMinioPath,
        cvFileName,
        cvFileSize,
        appliedAt: new Date(),
      },
      include: {
        jobProfile: true,
        advertisement: true,
      },
    });

    if (education && education.length > 0) {
      await prisma.applicantEducation.createMany({
        data: education.map((edu) => ({
          applicantId: applicant.id,
          degree: edu.degree,
          institution: edu.institution,
          fieldOfStudy: edu.fieldOfStudy,
          endYear: edu.endYear,
        })),
      });
    }

    if (experience && experience.length > 0) {
      await prisma.applicantExperience.createMany({
        data: experience.map((exp) => ({
          applicantId: applicant.id,
          company: exp.company,
          title: exp.title,
          description: exp.description,
        })),
      });
    }

    return NextResponse.json({ data: applicant }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error submitting application:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
