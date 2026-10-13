package com.resumeanalyzer.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Calls the Anthropic Claude API to analyze resume text (and optionally a job
 * description) and returns a strict JSON payload. Requires ANTHROPIC_API_KEY.
 */
@Service
public class AIAnalysisService {

    private static final Logger log = LoggerFactory.getLogger(AIAnalysisService.class);

    @Value("${anthropic.api.key:}")
    private String apiKey;

    @Value("${anthropic.api.model}")
    private String model;

    @Value("${anthropic.api.url}")
    private String apiUrl;

    private final ObjectMapper mapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(20))
            .build();

    public JsonNode analyze(String resumeText, String targetJobRole, String jobDescription) throws Exception {
        if (apiKey == null || apiKey.isBlank() || "mock".equalsIgnoreCase(apiKey.trim())) {
            log.info("No valid ANTHROPIC_API_KEY detected. Using intelligent Mock/Demo analyzer.");
            return generateMockAnalysis(resumeText, targetJobRole, jobDescription);
        }

        String requestBody = mapper.writeValueAsString(
                new AnthropicRequest(model, buildPrompt(resumeText, targetJobRole, jobDescription)));

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(apiUrl))
                .timeout(Duration.ofSeconds(90))
                .header("Content-Type", "application/json")
                .header("x-api-key", apiKey)
                .header("anthropic-version", "2023-06-01")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new RuntimeException("Anthropic API error (" + response.statusCode() + "): " + response.body());
        }

        String text = mapper.readTree(response.body()).path("content").get(0).path("text").asText();

        // Extract the JSON object even if the model adds stray text or code fences
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start < 0 || end <= start) {
            throw new RuntimeException("AI response did not contain valid JSON");
        }
        return mapper.readTree(text.substring(start, end + 1));
    }

    private String buildPrompt(String resumeText, String targetJobRole, String jobDescription) {
        StringBuilder sb = new StringBuilder();
        sb.append("You are an ATS (Applicant Tracking System) and resume analysis engine. ");
        sb.append("Analyze the resume below and respond with ONLY a JSON object, no preamble, no markdown fences.\n\n");
        sb.append("Target job role: ").append(targetJobRole == null || targetJobRole.isBlank() ? "Not specified" : targetJobRole).append("\n\n");
        if (jobDescription != null && !jobDescription.isBlank()) {
            sb.append("Job description to match against:\n").append(jobDescription).append("\n\n");
        }
        sb.append("Resume text:\n").append(resumeText).append("\n\n");
        sb.append("Return a JSON object with EXACTLY this shape:\n");
        sb.append("""
            {
              "atsScore": <integer 0-100>,
              "categoryScores": {
                "skills": <0-100>,
                "keywords": <0-100>,
                "projects": <0-100>,
                "experience": <0-100>,
                "formatting": <0-100>
              },
              "strongSkills": [<strings>],
              "missingSkills": [<strings>],
              "weakDescriptions": [<strings, brief notes on weak bullet points>],
              "missingSections": [<strings>],
              "suggestions": [<strings, actionable improvement tips>],
              "jobMatchPercent": <0-100, or null if no job description was provided>,
              "matchedKeywords": [<strings>],
              "missingKeywords": [<strings>],
              "skillGap": [<strings, skills to learn for the target role>],
              "recommendedRoles": [
                {"role": <string>, "matchPercent": <0-100>}
              ]
            }
            """);
        return sb.toString();
    }

    private JsonNode generateMockAnalysis(String resumeText, String targetJobRole, String jobDescription) {
        String lowerResume = (resumeText != null ? resumeText.toLowerCase() : "");
        String lowerJd = (jobDescription != null ? jobDescription.toLowerCase() : "");

        List<String> knownSkills = List.of(
            "Java", "Python", "JavaScript", "TypeScript", "React", "Angular", "Vue", "Node.js",
            "Spring Boot", "SQL", "MySQL", "PostgreSQL", "MongoDB", "Git", "Docker",
            "Kubernetes", "AWS", "REST APIs", "Microservices", "HTML", "CSS", "Linux",
            "CI/CD", "Agile", "JUnit", "Maven", "Machine Learning", "Data Analysis"
        );

        List<String> strongSkills = new ArrayList<>();
        List<String> missingSkills = new ArrayList<>();

        for (String skill : knownSkills) {
            if (lowerResume.contains(skill.toLowerCase())) {
                strongSkills.add(skill);
            } else {
                missingSkills.add(skill);
            }
        }

        if (strongSkills.isEmpty()) {
            strongSkills.addAll(List.of("Problem Solving", "Communication", "Team Collaboration", "Project Management"));
        }

        List<String> missingSkillsSample = missingSkills.stream().limit(5).collect(Collectors.toList());

        List<String> matchedKeywords = new ArrayList<>();
        List<String> missingKeywords = new ArrayList<>();
        Integer jobMatchPercent = null;

        if (jobDescription != null && !jobDescription.isBlank()) {
            for (String skill : knownSkills) {
                if (lowerJd.contains(skill.toLowerCase())) {
                    if (lowerResume.contains(skill.toLowerCase())) {
                        matchedKeywords.add(skill);
                    } else {
                        missingKeywords.add(skill);
                    }
                }
            }
            int totalJdSkills = matchedKeywords.size() + missingKeywords.size();
            if (totalJdSkills > 0) {
                jobMatchPercent = Math.min(100, Math.max(30, (matchedKeywords.size() * 100) / totalJdSkills));
            } else {
                jobMatchPercent = 75;
            }
            if (missingKeywords.isEmpty()) {
                missingKeywords.addAll(missingSkills.stream().limit(3).toList());
            }
        }

        int atsScore = Math.min(95, Math.max(65, 70 + (strongSkills.size() * 2)));

        Map<String, Object> categoryScores = new LinkedHashMap<>();
        categoryScores.put("skills", Math.min(98, 75 + strongSkills.size()));
        categoryScores.put("keywords", jobMatchPercent != null ? jobMatchPercent : 80);
        categoryScores.put("projects", 82);
        categoryScores.put("experience", 78);
        categoryScores.put("formatting", 90);

        List<String> weakDescriptions = List.of(
            "Some experience points lack quantifiable metrics (e.g. percentages, team sizes, dollar impact).",
            "Consider starting bullet points with stronger action verbs like 'Engineered', 'Spearheaded', or 'Optimized'."
        );

        List<String> missingSections = new ArrayList<>();
        if (!lowerResume.contains("summary") && !lowerResume.contains("objective")) {
            missingSections.add("Professional Summary");
        }
        if (!lowerResume.contains("certification") && !lowerResume.contains("certificate")) {
            missingSections.add("Certifications");
        }

        List<String> suggestions = List.of(
            "Add measurable outcomes to your bullet points to demonstrate concrete business impact (e.g., 'Reduced query latency by 35%').",
            "Incorporate industry-standard keywords from target job descriptions into your skills and summary sections.",
            "Keep technical skill headings concise and formatted consistently for ATS parsers.",
            "Ensure education and work experience dates follow a unified format (e.g., 'MM/YYYY - MM/YYYY')."
        );

        String role = (targetJobRole != null && !targetJobRole.isBlank()) ? targetJobRole : "Software Engineer";
        List<Map<String, Object>> recommendedRoles = List.of(
            Map.of("role", role, "matchPercent", jobMatchPercent != null ? jobMatchPercent : 85),
            Map.of("role", "Full Stack Developer", "matchPercent", 80),
            Map.of("role", "Backend Developer", "matchPercent", 78)
        );

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("atsScore", atsScore);
        result.put("categoryScores", categoryScores);
        result.put("strongSkills", strongSkills);
        result.put("missingSkills", missingSkillsSample);
        result.put("weakDescriptions", weakDescriptions);
        result.put("missingSections", missingSections);
        result.put("suggestions", suggestions);
        result.put("jobMatchPercent", jobMatchPercent);
        result.put("matchedKeywords", matchedKeywords);
        result.put("missingKeywords", missingKeywords);
        result.put("skillGap", missingSkillsSample);
        result.put("recommendedRoles", recommendedRoles);

        return mapper.valueToTree(result);
    }

    private static class AnthropicRequest {
        public String model;
        public int max_tokens = 2000;
        public List<Message> messages;

        AnthropicRequest(String model, String prompt) {
            this.model = model;
            this.messages = List.of(new Message("user", prompt));
        }
    }

    private static class Message {
        public String role;
        public String content;
        Message(String role, String content) {
            this.role = role;
            this.content = content;
        }
    }
}
