/**
 * User Controller
 * 
 * @semantic-tags: controller-class, user-domain, public-api
 * @description: 사용자 관련 HTTP 요청을 처리하는 컨트롤러
 */

package com.example.user.controller;

import com.example.user.model.User;
import com.example.user.service.UserService;
import com.example.user.dto.UserCreateRequest;
import com.example.user.dto.UserUpdateRequest;
import com.example.user.dto.UserResponse;
import com.example.user.exception.UserNotFoundException;
import com.example.user.exception.ValidationException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.validation.annotation.Validated;
import javax.validation.Valid;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 사용자 컨트롤러
 * 
 * @semantic-tags: controller-class, user-domain, public-api
 */
@RestController
@RequestMapping("/api/users")
@Validated
public class UserController {

    @Autowired
    private UserService userService;

    /**
     * 사용자 생성
     * 
     * @semantic-tags: create-endpoint, public-api
     * @param request 사용자 생성 요청
     * @return 생성된 사용자 정보
     */
    @PostMapping
    public ResponseEntity<UserResponse> createUser(@Valid @RequestBody UserCreateRequest request) {
        try {
            User user = userService.createUser(request);
            UserResponse response = convertToResponse(user);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (ValidationException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 사용자 조회
     * 
     * @semantic-tags: read-endpoint, public-api
     * @param id 사용자 ID
     * @return 사용자 정보
     */
    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUser(@PathVariable Long id) {
        try {
            User user = userService.getUserById(id);
            UserResponse response = convertToResponse(user);
            return ResponseEntity.ok(response);
        } catch (UserNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 사용자 목록 조회
     * 
     * @semantic-tags: read-endpoint, public-api
     * @param page 페이지 번호
     * @param size 페이지 크기
     * @return 사용자 목록
     */
    @GetMapping
    public ResponseEntity<List<UserResponse>> getUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        try {
            List<User> users = userService.getUsers(page, size);
            List<UserResponse> responses = users.stream()
                    .map(this::convertToResponse)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(responses);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 사용자 정보 업데이트
     * 
     * @semantic-tags: update-endpoint, public-api
     * @param id 사용자 ID
     * @param request 사용자 업데이트 요청
     * @return 업데이트된 사용자 정보
     */
    @PutMapping("/{id}")
    public ResponseEntity<UserResponse> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UserUpdateRequest request) {
        try {
            User user = userService.updateUser(id, request);
            UserResponse response = convertToResponse(user);
            return ResponseEntity.ok(response);
        } catch (UserNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (ValidationException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 사용자 삭제
     * 
     * @semantic-tags: delete-endpoint, public-api
     * @param id 사용자 ID
     * @return 삭제 결과
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        try {
            userService.deleteUser(id);
            return ResponseEntity.noContent().build();
        } catch (UserNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 사용자 검색
     * 
     * @semantic-tags: search-endpoint, public-api
     * @param query 검색 쿼리
     * @param page 페이지 번호
     * @param size 페이지 크기
     * @return 검색 결과
     */
    @GetMapping("/search")
    public ResponseEntity<List<UserResponse>> searchUsers(
            @RequestParam String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        try {
            List<User> users = userService.searchUsers(query, page, size);
            List<UserResponse> responses = users.stream()
                    .map(this::convertToResponse)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(responses);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 사용자 인증
     * 
     * @semantic-tags: auth-endpoint, public-api
     * @param email 이메일
     * @param password 비밀번호
     * @return 인증 결과
     */
    @PostMapping("/authenticate")
    public ResponseEntity<UserResponse> authenticateUser(
            @RequestParam String email,
            @RequestParam String password) {
        try {
            User user = userService.authenticateUser(email, password);
            if (user != null) {
                UserResponse response = convertToResponse(user);
                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 사용자 엔티티를 응답 DTO로 변환
     * 
     * @semantic-tags: converter-method, private-method
     * @param user 사용자 엔티티
     * @return 사용자 응답 DTO
     */
    private UserResponse convertToResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .name(user.getName())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
