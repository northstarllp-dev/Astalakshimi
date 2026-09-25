import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Step6Verify } from "./step-verify"
import { emptySignupData, type SignupData } from "@/lib/profile-store"

const { uploadMediaFile } = vi.hoisted(() => ({
  uploadMediaFile: vi.fn(),
}))

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    getToken: () => "token",
    media: {
      uploadMediaFile: (...args: unknown[]) => uploadMediaFile(...args),
      previewVerification: vi.fn(async () => ({ url: "https://signed.example/preview.jpg" })),
    },
  },
}))

function setupCamera() {
  const track = { stop: vi.fn() }
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: vi.fn(async () => ({ getTracks: () => [track] })),
    },
  })
  HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve())
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    drawImage: vi.fn(),
  })) as unknown as typeof HTMLCanvasElement.prototype.getContext
  HTMLCanvasElement.prototype.toDataURL = vi.fn(() => "data:image/jpeg;base64,abc")
  HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => {
    callback(new Blob(["selfie"], { type: "image/jpeg" }))
  }) as unknown as typeof HTMLCanvasElement.prototype.toBlob
}

describe("Step6Verify uploads", () => {
  beforeEach(() => {
    uploadMediaFile.mockReset()
    uploadMediaFile.mockImplementation(async (_file: File, purpose: string) => {
      if (purpose === "selfie") return { s3Key: "verifications/user/selfie-1.jpg" }
      if (purpose === "govt_id") return { s3Key: "verifications/user/govt-id-1.pdf" }
      return { s3Key: "profiles/user/horoscopes/chart.pdf" }
    })
    setupCamera()
  })

  function renderStep(patch: Partial<SignupData> = {}) {
    const updates: Partial<SignupData>[] = []
    const data: SignupData = {
      ...emptySignupData(),
      photos: ["blob:photo"],
      govtIdType: "PAN card",
      ...patch,
    }
    render(
      <Step6Verify
        data={data}
        updateData={(fields) => {
          updates.push(fields)
          Object.assign(data, fields)
        }}
        onSubmit={vi.fn()}
      />,
    )
    return { data, updates }
  }

  it("shows a signed selfie preview instead of a public vault URL", async () => {
    renderStep({
      selfieS3Key: "verifications/11111111-1111-4111-8111-111111111111/selfie-22222222-2222-4222-8222-222222222222.jpg",
      selfiePhoto: "https://ashtalakshmi-media.s3.ap-south-1.amazonaws.com/verifications/selfie.jpg",
    })

    const preview = await screen.findByAltText("Selfie preview")
    expect(preview).toHaveAttribute("src", "https://signed.example/preview.jpg")
  })

  it("shows the selfie and government ID together and keeps Create profile disabled until both are stored", () => {
    renderStep()
    expect(screen.getByText("Live selfie")).toBeInTheDocument()
    expect(screen.getByText("Government ID")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Create profile" })).toBeDisabled()
  })

  it("captures a live selfie and uploads the jpeg to S3", async () => {
    const user = userEvent.setup()
    const { updates } = renderStep()

    await user.click(screen.getByRole("button", { name: /open camera/i }))
    const capture = await screen.findByRole("button", { name: /capture selfie/i })
    await waitFor(() => expect(capture).toBeEnabled())
    await user.click(capture)

    await waitFor(() => {
      expect(uploadMediaFile).toHaveBeenCalledWith(expect.any(File), "selfie")
    })
    const selfieCall = uploadMediaFile.mock.calls.find((call) => call[1] === "selfie")
    expect((selfieCall?.[0] as File).type).toBe("image/jpeg")
    expect(updates.some((fields) => fields.selfieS3Key === "verifications/user/selfie-1.jpg")).toBe(true)
  })

  it("uploads a government ID PDF without clearing the selfie", async () => {
    const user = userEvent.setup()
    const { updates } = renderStep({
      selfieS3Key: "verifications/user/selfie-1.jpg",
      selfiePhoto: "data:image/jpeg;base64,abc",
    })

    const idInput = document.querySelectorAll('input[type="file"]')[1] as HTMLInputElement
    const pdf = new File(["%PDF"], "pan-card.pdf", { type: "application/pdf" })
    await user.upload(idInput, pdf)

    await waitFor(() => {
      expect(uploadMediaFile).toHaveBeenCalledWith(expect.any(File), "govt_id")
    })
    const saved = updates.find((fields) => fields.govtIdS3Key)
    expect(saved?.govtIdS3Key).toBe("verifications/user/govt-id-1.pdf")
    expect(saved?.govtIdFileName).toBe("pan-card.pdf")
    expect(saved).not.toHaveProperty("selfieS3Key", "")
    expect(screen.getByText("ID uploaded")).toBeInTheDocument()
    expect(screen.getByText("pan-card.pdf")).toBeInTheDocument()
  })

  it("does not keep a government ID when the S3 upload fails", async () => {
    uploadMediaFile.mockRejectedValue(new Error("S3 unavailable"))
    const user = userEvent.setup()
    const { updates } = renderStep()

    const idInput = document.querySelectorAll('input[type="file"]')[1] as HTMLInputElement
    await user.upload(idInput, new File(["%PDF"], "pan.pdf", { type: "application/pdf" }))

    expect(await screen.findByText(/S3 unavailable/i)).toBeInTheDocument()
    expect(updates.some((fields) => fields.govtIdS3Key)).toBe(false)
  })

  it("uploads a horoscope JPG to S3", async () => {
    const user = userEvent.setup()
    const { updates } = renderStep()

    const horoscopeInput = document.querySelector('input[accept*="image/jpeg"]') as HTMLInputElement
    const jpg = new File(["jpeg"], "kundli.jpg", { type: "image/jpeg" })
    await user.upload(horoscopeInput, jpg)

    await waitFor(() => {
      expect(uploadMediaFile).toHaveBeenCalledWith(expect.any(File), "horoscope")
    })
    expect(updates.some((fields) => fields.horoscopeS3Key === "profiles/user/horoscopes/chart.pdf")).toBe(true)
    expect(screen.getByText("kundli.jpg")).toBeInTheDocument()
  })

  it("uploads a horoscope PDF to S3", async () => {
    const user = userEvent.setup()
    const { updates } = renderStep()

    const horoscopeInput = document.querySelector('input[accept*="application/pdf"]') as HTMLInputElement
    const pdf = new File(["%PDF"], "kundli.pdf", { type: "application/pdf" })
    await user.upload(horoscopeInput, pdf)

    await waitFor(() => {
      expect(uploadMediaFile).toHaveBeenCalledWith(expect.any(File), "horoscope")
    })
    expect(updates.some((fields) => fields.horoscopeS3Key === "profiles/user/horoscopes/chart.pdf")).toBe(true)
    expect(screen.getByText("kundli.pdf")).toBeInTheDocument()
  })
})
