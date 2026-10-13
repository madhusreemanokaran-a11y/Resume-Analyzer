package com.resumeanalyzer.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Calls the Anthropic Claude API to analyze resume text and (optionally) a job
 * description, returning a strict JSON payload with ATS score, skill
 * breakdown, job match %, and skill gap.
 *
 * Requires ANTHROPIC_API_KEY to be set as an environment variable.
 */
@Service
public class AIAnalysisService {

    @Value("${anthropic.api.key}")
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
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException(
                "ANTHROPIC_API_KEY is not set. Export it as an environment variable before starting the backend.");
        }

        String prompt = buildPrompt(resumeText, targetJobRole, jobDescription);

        String requestBody = mapper.writeValueAsString(new AnthropicRequest(model, prompt));

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(apiUrl))
                .header("Content-Type", "application/json")
                .header("x-api-key", apiKey)
                .header("anthropic-version", "2023-06-01")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new RuntimeException("Anthropic API error (" + response.statusCode() + "): " + response.body());
        }

        JsonNode root = mapper.readTree(response.body());
        String text = root.path("content").get(0).path("text").asText();

        // Strip markdown code fences if the model wraps the JSON in them
        String cleaned = text.trim()
                .replaceAll("^```json", "")
                .replaceAll("^```", "")
                .replaceAll("```$", "")
                .trim();

        return mapper.readTree(cleaned);
    }

    private String buildPrompt(String resumeText, String targetJobRole, String jobDescription) {
        StringBuilder sb = new StringBuilder();
        sb.append("You are an ATS (Applicant Tracking System) and resume analysis engine. ");
        sb.append("Analyze the resume below and respond with ONLY a JSON object, no preamble, no markdown fences.\n\n");
        sb.append("Target job role: ").append(targetJobRole == null ? "Not specified" : targetJobRole).append("\n\n");

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

    // Minimal request shape for the Anthropic /v1/messages endpoint
    private static class AnthropicRequest {
        public String model;
        public int max_tokens = 2000;
        public java.util.List<Message> messages;

        AnthropicRequest(String model, String prompt) {
            this.model = model;
            this.messages = java.util.List.of(new Message("user", prompt));
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
