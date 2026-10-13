package com.resumeanalyzer.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.resumeanalyzer.model.Analysis;
import com.resumeanalyzer.model.Resume;
import com.resumeanalyzer.model.User;
import com.resumeanalyzer.repository.AnalysisRepository;
import com.resumeanalyzer.repository.ResumeRepository;
import com.resumeanalyzer.repository.UserRepository;
import com.resumeanalyzer.service.AIAnalysisService;
import com.resumeanalyzer.service.ResumeParsingService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/resume")
public class ResumeController {

    private final ResumeParsingService parsingService;
    private final AIAnalysisService aiAnalysisService;
    private final ResumeRepository resumeRepository;
    private final AnalysisRepository analysisRepository;
    private final UserRepository userRepository;

    public ResumeController(ResumeParsingService parsingService,
                            AIAnalysisService aiAnalysisService,
                            ResumeRepository resumeRepository,
                            AnalysisRepository analysisRepository,
                            UserRepository userRepository) {
        this.parsingService = parsingService;
        this.aiAnalysisService = aiAnalysisService;
        this.resumeRepository = resumeRepository;
        this.analysisRepository = analysisRepository;
        this.userRepository = userRepository;
    }

    @PostMapping(value = "/analyze", consumes = "multipart/form-data")
    public ResponseEntity<?> analyze(
            Authentication authentication,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "jobDescription", required = false) String jobDescription
    ) {
        Long userId = (Long) authentication.getPrincipal();
        User user = userRepository.findById(userId).orElseThrow();

        try {
            String extractedText = parsingService.extractText(file);
            if (extractedText == null || extractedText.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error",
                        "Could not read any text from this file. If it's a scanned image PDF, please upload a text-based version."));
            }

            Resume resume = new Resume();
            resume.setUser(user);
            resume.setOriginalFilename(file.getOriginalFilename());
            resume.setExtractedText(extractedText);
            resume.setJobDescription(jobDescription);
            resume = resumeRepository.save(resume);

            JsonNode result = aiAnalysisService.analyze(extractedText, user.getTargetJobRole(), jobDescription);

            Analysis analysis = new Analysis();
            analysis.setResume(resume);
            analysis.setUser(user);
            analysis.setAtsScore(result.path("atsScore").isNumber() ? result.path("atsScore").asInt() : null);
            analysis.setJobMatchPercent(result.path("jobMatchPercent").isNumber() ? result.path("jobMatchPercent").asInt() : null);
            analysis.setResultJson(result.toString());
            analysis = analysisRepository.save(analysis);

            return ResponseEntity.ok(analysis);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(503).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Analysis failed: " + e.getMessage()));
        }
    }
}
